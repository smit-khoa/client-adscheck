import { graphql } from '@/api/fb-graph';
import { isGraphError } from '@/api/types';
import { runWithConcurrency } from '../utils/concurrency';
import type { BmRow, BmRowPatch } from '../types/bm-data-loading.types';

interface RestrictionResponse {
  data?: {
    viewer?: {
      ad_businesses?: {
        nodes?: Array<{
          id?: string;
          advertising_restriction_info?: RestrictionInfo | null;
        }>;
      };
    };
  };
}

interface RestrictionInfo {
  restriction_type?: string | null;
  status?: string | null;
  appeal_status?: string | null;
}

interface EnforcementResponse {
  data?: unknown;
}

function mapRestriction(info?: RestrictionInfo | null): { appealStatus: string; appealLabel: string } {
  const raw = String(info?.restriction_type ?? info?.status ?? info?.appeal_status ?? '').toUpperCase();
  if (!raw || raw === 'NOT_RESTRICTED') return { appealStatus: 'live', appealLabel: 'Live' };
  if (raw === 'APPEAL_TIMEOUT') return { appealStatus: 'die_permanent', appealLabel: 'Die vĩnh viễn' };
  if (raw === 'VANILLA_RESTRICTED') return { appealStatus: 'die_3strike', appealLabel: 'Die 3 dòng' };
  if (raw === 'APPEAL_PENDING' || raw === 'UNDER_REVIEW') return { appealStatus: 'days_left', appealLabel: 'Đang xem xét' };
  return { appealStatus: 'unknown', appealLabel: raw };
}

function findDaysLeft(value: unknown): string {
  const text = JSON.stringify(value ?? '');
  return text.match(/(\d+\s*ngày|\d+\s*days?)/i)?.[1] ?? '';
}

export async function fetchBmStatusOverview(rows: BmRow[]): Promise<BmRowPatch[]> {
  const res = await graphql<RestrictionResponse>(
    {
      doc_id: '4941582179260904',
      variables: JSON.stringify({}),
    },
    'business'
  );
  if (isGraphError(res)) throw new Error(res.message);

  const nodes = res.data?.viewer?.ad_businesses?.nodes ?? [];
  const byId = new Map(nodes.map((node) => [String(node.id ?? ''), node]));
  return rows.map((row) => {
    const status = mapRestriction(byId.get(row.bmId)?.advertising_restriction_info);
    return { bmId: row.bmId, status: status.appealLabel, ...status };
  });
}

async function fetchEnforcementDetail(bmId: string): Promise<BmRowPatch> {
  const res = await graphql<EnforcementResponse>(
    {
      fb_api_req_friendly_name: 'BSHEnforcedEntityGAMEDetailsRootQuery',
      doc_id: '25166016149718566',
      variables: JSON.stringify({
        ides_enforcement_instance_id: bmId,
        screen: 'DETAIL',
        entityID: bmId,
        entrypoint: 'BSH_ENFORCED_ENTITY_PAGE',
        scale: 1,
      }),
    },
    'business'
  );
  if (isGraphError(res)) throw new Error(res.message);
  return { bmId, appealDaysLeft: findDaysLeft(res) };
}

export async function fetchBmStatus(rows: BmRow[]): Promise<BmRowPatch[]> {
  const patches = await fetchBmStatusOverview(rows);
  const needDetail = patches.filter(
    (patch) => patch.appealStatus && patch.appealStatus !== 'live' && patch.appealStatus !== 'unknown'
  );
  const detailPatches: BmRowPatch[] = [];
  await runWithConcurrency(needDetail, 3, async (patch) => {
    try {
      detailPatches.push(await fetchEnforcementDetail(patch.bmId));
    } catch {
      // Overview status is still useful; enforcement detail is best-effort per BM.
    }
  });
  return [...patches, ...detailPatches];
}
