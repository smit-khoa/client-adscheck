import { ref } from 'vue';
import { shareBmUser, type ShareRole } from '../../../../api/tools/bm/share-bm-users';
import { cancelPendingInvites, type CancelMode } from '../../../../api/tools/bm/cancel-pending-invites';
import { createBm, type CreateBmMode } from '../../../../api/tools/bm/create-bm';
import { leaveBm } from '../../../../api/tools/bm/leave-bm';
import { deleteBm } from '../../../../api/tools/bm/delete-bm';
import { createAdAccount, type CreateAdAccountMode } from '../../../../api/tools/bm/create-adaccount';
import {
  claimAdAccount,
  claimAdAccountBatch,
  type ClaimMode,
} from '../../../../api/tools/bm/claim-adaccount';
import { requestAdAccountAccess } from '../../../../api/tools/bm/request-adaccount-access';
import { createPageInBm } from '../../../../api/tools/bm/create-page-bm';
import {
  removeSharedAdAccount,
  type RemoveShareMode,
} from '../../../../api/tools/bm/remove-shared-adaccount';
import { claimPage, type ClaimPageMode } from '../../../../api/tools/bm/claim-page';
import { reactivatePage } from '../../../../api/tools/bm/reactivate-page';
import { removePage, type RemovePageMode } from '../../../../api/tools/bm/remove-page';
import { renameBm, type RenameBmMode } from '../../../../api/tools/bm/rename-bm';
import { updateBmLegal, type BmLegalInfo } from '../../../../api/tools/bm/update-bm-legal';
import { removeIgAccount } from '../../../../api/tools/bm/remove-ig-account';
import { enableMonthlyInvoicing } from '../../../../api/tools/bm/enable-monthly-invoicing';
import { createBag } from '../../../../api/tools/bm/bag-create';
import { bagAddAssets, type BagAssetType } from '../../../../api/tools/bm/bag-add-assets';
import {
  assignAssetsToUser,
  type AssignAssetType,
  type AssignRole,
} from '../../../../api/tools/bm/assign-assets-to-user';
import { removePartner, type RemovePartnerMode } from '../../../../api/tools/bm/remove-partner';
import { addBmDomain } from '../../../../api/tools/bm/add-bm-domain';
import { optOutBmConsole } from '../../../../api/tools/bm/optout-bm-console';
import { createWaba, type WabaApiMode } from '../../../../api/tools/bm/create-waba';
import { showReadonlyAdAccount } from '../../../../api/tools/bm/show-readonly-adaccount';

// Data-driven dispatch for the BM action panel. Each catalog function id maps to a
// runner that knows how to expand its form values into a flat job list; the shared
// concurrency loop runs those jobs. The panel stays dumb — it only passes the open
// function's id + form values + selected BM ids, and shows the aggregated summary.
// Replaces the old hard-coded "if share-bm-users" dispatch.

export interface RunSummary {
  ok: number;
  total: number;
  errors: string[];
  // Non-error "nothing to do" outcomes (e.g. cancel by-email matched no invite) —
  // surfaced as a warning toast, distinct from success and from failure.
  warnings: string[];
}

interface RunContext {
  bmIds: string[];
  values: Record<string, string | boolean>;
}

interface RunnerDef {
  // false = runs per session, no BM selection needed (Create BM). Default true.
  requiresBm: boolean;
  execute(ctx: RunContext, settings: { threads: number; delayMs: number }): Promise<RunSummary>;
}

// Parse a textarea into emails: one per line, trimmed, must contain '@'.
export function parseEmails(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

// Parse a textarea into trimmed non-empty lines. Used for ad-account id lists,
// which (unlike emails) have no '@' to filter on.
export function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Parse a textarea into domains: one per line, trimmed, must match a simple
// domain shape (label.tld). Invalid lines are dropped so junk never becomes an
// FB job. KISS — no IDN/punycode handling.
export function parseDomains(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s));
}

function clamp(value: number, min: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Shared bounded-concurrency loop. N lanes pull the next job, run `fn`, then wait
// `delayMs` before the next — so the delay throttles per-lane FB call rate. Errors
// aggregate (prefixed with `label(job)`), never thrown, so one bad job never aborts
// the run. Generic over job shape: share = bmId×email, cancel/leave = bmId, create
// = one per requested count.
async function runJobs<J>(
  jobs: J[],
  fn: (j: J) => Promise<{ ok: boolean; message: string; warn?: boolean }>,
  label: (j: J) => string,
  threads: number,
  delayMs: number
): Promise<RunSummary> {
  const total = jobs.length;
  const errors: string[] = [];
  const warnings: string[] = [];
  let ok = 0;
  let next = 0;

  const lanes = Math.min(clamp(threads, 1, 5), Math.max(total, 1));
  const wait = clamp(delayMs, 0, 200);

  async function worker(): Promise<void> {
    while (true) {
      const job = jobs[next++];
      if (!job) return;
      const res = await fn(job);
      // warn = ran fine but had no effect (e.g. no matching invite) — neither a
      // success nor a failure, so it doesn't inflate the ok count.
      if (res.warn) warnings.push(`${label(job)}: ${res.message}`);
      else if (res.ok) ok += 1;
      else errors.push(`${label(job)}: ${res.message}`);
      if (wait > 0) await sleep(wait);
    }
  }

  await Promise.all(Array.from({ length: lanes }, worker));
  return { ok, total, errors, warnings };
}

const REGISTRY: Record<string, RunnerDef> = {
  'share-bm-users': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const emails = parseEmails(String(values.emails ?? ''));
      const role = (values.role as ShareRole) ?? 'admin';
      const jobs = bmIds.flatMap((bmId) => emails.map((email) => ({ bmId, email })));
      return runJobs(
        jobs,
        (j) => shareBmUser(j.bmId, j.email, role),
        (j) => `${j.bmId} · ${j.email}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'cancel-pending-invites': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const mode = (values.mode as CancelMode) ?? 'all';
      const emails = mode === 'by-email' ? parseEmails(String(values.emails ?? '')) : [];
      const jobs = bmIds.map((bmId) => ({ bmId }));
      return runJobs(
        jobs,
        (j) => cancelPendingInvites(j.bmId, mode, emails),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'leave-bm': {
    requiresBm: true,
    execute: ({ bmIds }, s) =>
      runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => leaveBm(j.bmId, 'fb'),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      ),
  },
  'delete-bm': {
    requiresBm: true,
    execute: ({ bmIds }, s) =>
      runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => deleteBm(j.bmId),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      ),
  },
  'create-adaccount': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const name = String(values.accName ?? '').trim();
      const count = Math.max(1, Number(values.count) || 1);
      const currency = String(values.currency ?? 'USD');
      const timezoneId = String(values.timezoneId ?? '140');
      const mode = (values.mode as CreateAdAccountMode) ?? 'meofb';
      const jobs = bmIds.flatMap((bmId) =>
        Array.from({ length: count }, (_, i) => ({ bmId, i }))
      );
      return runJobs(
        jobs,
        (j) => createAdAccount(j.bmId, { name, currency, timezoneId, mode }),
        (j) => `${j.bmId} #${j.i + 1}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'claim-adaccount': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const adIds = parseLines(String(values.adAccountIds ?? ''));
      const mode = (values.mode as ClaimMode) ?? 'meofb';
      if (mode === 'xmeta-batch') {
        // 1 job per BM, claim all adIds in one batch call.
        return runJobs(
          bmIds.map((bmId) => ({ bmId })),
          (j) => claimAdAccountBatch(j.bmId, adIds),
          (j) => `${j.bmId} (batch ${adIds.length})`,
          s.threads,
          s.delayMs
        );
      }
      // meofb / xmeta-single: 1 job per bmId × adId.
      const jobs = bmIds.flatMap((bmId) => adIds.map((adId) => ({ bmId, adId })));
      return runJobs(
        jobs,
        (j) => claimAdAccount(j.bmId, j.adId, mode),
        (j) => `${j.bmId} · ${j.adId}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'create-bm': {
    requiresBm: false, // runs per session — no BM selection needed
    execute: ({ values }, s) => {
      const name = String(values.bmName ?? '').trim();
      const count = Math.max(1, Number(values.bmCount) || 1);
      const mode = (values.createBmMode as CreateBmMode) ?? 'over';
      const jobs = Array.from({ length: count }, (_, i) => ({ name, mode, i }));
      return runJobs(
        jobs,
        (j) => createBm(j.name, j.mode),
        (j) => `${j.name} #${j.i + 1}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'request-adaccount-access': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const adIds = parseLines(String(values.adAccountIds ?? ''));
      const jobs = bmIds.flatMap((bmId) => adIds.map((adId) => ({ bmId, adId })));
      return runJobs(
        jobs,
        (j) => requestAdAccountAccess(j.bmId, j.adId),
        (j) => `${j.bmId} · ${j.adId}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'create-page-bm': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const names = parseLines(String(values.pageNames ?? ''));
      const jobs = bmIds.flatMap((bmId) => names.map((name) => ({ bmId, name })));
      return runJobs(
        jobs,
        (j) => createPageInBm(j.bmId, j.name),
        (j) => `${j.bmId} · ${j.name}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'add-bm-domain': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const domains = parseDomains(String(values.domains ?? ''));
      const jobs = bmIds.flatMap((bmId) => domains.map((domain) => ({ bmId, domain })));
      return runJobs(
        jobs,
        (j) => addBmDomain(j.bmId, j.domain),
        (j) => `${j.bmId} · ${j.domain}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'remove-shared-adaccount': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const mode = (values.mode as RemoveShareMode) ?? 'all';
      const ids = mode === 'id' ? parseLines(String(values.adAccountIds ?? '')) : [];
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => removeSharedAdAccount(j.bmId, mode, ids),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'remove-partner': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const mode = (values.mode as RemovePartnerMode) ?? 'all';
      const ids = mode === 'id' ? parseLines(String(values.partnerIds ?? '')) : [];
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => removePartner(j.bmId, mode, ids),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'claim-page': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const pageIds = parseLines(String(values.pageIds ?? ''));
      const mode = (values.mode as ClaimPageMode) ?? 'meofb';
      // 1 job per bmId × pageId.
      const jobs = bmIds.flatMap((bmId) => pageIds.map((pageId) => ({ bmId, pageId })));
      return runJobs(
        jobs,
        (j) => claimPage(j.bmId, j.pageId, mode),
        (j) => `${j.bmId} · ${j.pageId}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'reactivate-page': {
    requiresBm: true,
    execute: ({ bmIds }, s) =>
      runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => reactivatePage(j.bmId),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      ),
  },
  'remove-page': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const mode = (values.mode as RemovePageMode) ?? 'all';
      const ids = mode === 'id' ? parseLines(String(values.pageIds ?? '')) : [];
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => removePage(j.bmId, mode, ids),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'rename-bm': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const name = String(values.bmName ?? '').trim();
      const mode = (values.mode as RenameBmMode) ?? 'meofb';
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => renameBm(j.bmId, name, mode),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'update-bm-legal': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const info: BmLegalInfo = {
        legalName: String(values.legalName ?? '').trim(),
        street: String(values.street ?? '').trim(),
        city: String(values.city ?? '').trim(),
        state: String(values.state ?? '').trim(),
        postal: String(values.postal ?? '').trim(),
        country: String(values.country ?? '').trim(),
        phone: String(values.phone ?? '').trim(),
        website: String(values.website ?? '').trim(),
        taxId: String(values.taxId ?? '').trim(),
      };
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => updateBmLegal(j.bmId, info),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'remove-ig-account': {
    requiresBm: true,
    execute: ({ bmIds }, s) =>
      runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => removeIgAccount(j.bmId),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      ),
  },
  'enable-monthly-invoicing': {
    requiresBm: true,
    execute: ({ bmIds }, s) =>
      runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => enableMonthlyInvoicing(j.bmId),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      ),
  },
  'create-bag': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const name = String(values.bagName ?? '').trim();
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => createBag(j.bmId, name),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      );
    },
  },
  'bag-add-assets': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const bagId = String(values.bagId ?? '').trim();
      const assetType = (values.assetType as BagAssetType) ?? 'ad-account';
      const assetIds = parseLines(String(values.assetIds ?? ''));
      // 1 job per BM — all assetIds added in a single call (split per-asset is the
      // test-live fallback if FB rejects the batched array).
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => bagAddAssets(j.bmId, bagId, assetType, assetIds),
        (j) => `${j.bmId} (${assetIds.length} tài sản)`,
        s.threads,
        s.delayMs
      );
    },
  },
  'assign-assets-to-user': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const userId = String(values.userId ?? '').trim();
      const assetType = (values.assetType as AssignAssetType) ?? 'ad-account';
      const role = (values.role as AssignRole) ?? 'manage';
      const assetIds = parseLines(String(values.assetIds ?? ''));
      // 1 job per BM — all assetIds assigned in a single call (split per-asset is
      // the test-live fallback if FB rejects the batched array).
      return runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => assignAssetsToUser(j.bmId, userId, assetType, assetIds, role),
        (j) => `${j.bmId} · ${userId}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'optout-bm-console': {
    requiresBm: false, // per-user opt-out — no BM selection needed
    execute: (_ctx, s) =>
      runJobs(
        [{}],
        () => optOutBmConsole(),
        () => 'giao diện cũ',
        s.threads,
        s.delayMs
      ),
  },
  'create-waba': {
    requiresBm: true,
    execute: ({ bmIds, values }, s) => {
      const name = String(values.wabaName ?? '').trim();
      const count = Math.max(1, Number(values.wabaCount) || 1);
      const mode = (values.mode as WabaApiMode) ?? '4';
      // job = bmId × count (one WABA per call, like create-adaccount).
      const jobs = bmIds.flatMap((bmId) => Array.from({ length: count }, (_, i) => ({ bmId, i })));
      return runJobs(
        jobs,
        (j) => createWaba(j.bmId, { name, mode }),
        (j) => `${j.bmId} #${j.i + 1}`,
        s.threads,
        s.delayMs
      );
    },
  },
  'show-readonly-adaccount': {
    requiresBm: true,
    execute: ({ bmIds }, s) =>
      runJobs(
        bmIds.map((bmId) => ({ bmId })),
        (j) => showReadonlyAdAccount(j.bmId),
        (j) => j.bmId,
        s.threads,
        s.delayMs
      ),
  },
};

// Single source of run-control settings (the old use-bm-share copies are removed).
const threads = ref(5);
const delayMs = ref(200);
const isRunning = ref(false);

export function useBmRunner() {
  const getRunner = (id: string | null): RunnerDef | null => (id ? (REGISTRY[id] ?? null) : null);

  const run = (id: string, ctx: RunContext): Promise<RunSummary> => {
    const r = REGISTRY[id];
    if (!r)
      return Promise.resolve({ ok: 0, total: 0, errors: [`Không có runner: ${id}`], warnings: [] });
    return r.execute(ctx, { threads: threads.value, delayMs: delayMs.value });
  };

  return { threads, delayMs, isRunning, getRunner, run };
}
