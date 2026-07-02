import { graph, graphql } from '@/api/fb-graph';
import { isGraphError } from '@/api/types';
import type { BmRowPatch } from '../types/bm-data-loading.types';

interface AdminRecord {
  id: string;
  name: string;
  email: string;
  type: string;
  role: string;
  active: string;
}

interface PeopleResponse {
  data?: {
    business?: PeopleBusiness;
  };
}

interface PeopleBusiness {
  business_users_and_invitations?: {
    edges?: Array<{ node?: Record<string, any> }>;
  };
}

interface SystemUsersResponse {
  system_users?: {
    data?: Array<{ id?: string; name?: string; role?: string }>;
  };
}

function parseRole(node: Record<string, any>): string {
  const details = node.roleColumn?.permitted_business_account_tasks_summary?.standalone?.primary_access_details;
  if (Array.isArray(details) && details.length > 0) {
    const raw = String(details[0]?.title ?? details[0]?.label ?? details[0] ?? '');
    return raw.toLowerCase().includes('basic') ? 'Basic' : 'Admin';
  }
  return String(node.roleColumn?.role ?? node.roleColumn?.access_type ?? '');
}

function parsePeople(payload: PeopleResponse): AdminRecord[] {
  const business = payload.data?.business ?? {};
  const edges = business.business_users_and_invitations?.edges ?? [];
  return edges.map((edge): AdminRecord => {
    const node = edge.node ?? {};
    const info = node.userInfoForSelection ?? node.nameColumn?.user ?? {};
    const email = String(node.nameColumn?.email ?? '');
    const type = String(node.nameColumn?.backed_user_type ?? (email ? 'PENDING' : 'FACEBOOK'));
    const name = String(info.name ?? node.nameColumn?.name ?? email ?? '');
    const activeTime = String(node.lastActiveColumn?.last_active_time ?? '');
    return {
      id: String(info.id ?? node.id ?? email),
      name,
      email,
      type: type || 'PENDING',
      role: parseRole(node),
      active: activeTime.length > 5 ? 'Active' : 'None',
    };
  });
}

async function fetchPeopleViaGraphApi(bmId: string): Promise<PeopleResponse> {
  const res = await graph<PeopleResponse>('https://graph.facebook.com/graphql', {
    method: 'POST',
    params: {
      fb_api_req_friendly_name: 'BizKitSettingsPeopleTableListPaginationQuery',
      doc_id: '9371006629693295',
      variables: JSON.stringify({ id: bmId, first: 200, orderBy: 'MOST_RECENTLY_CREATED' }),
    },
  });
  if (isGraphError(res)) throw new Error(res.message);
  return res;
}

async function fetchPeopleViaBusinessGraphql(bmId: string): Promise<PeopleResponse> {
  const res = await graphql<PeopleResponse>(
    {
      fb_api_req_friendly_name: 'BizKitSettingsPeopleTableListPaginationQuery',
      doc_id: '24411698895145972',
      variables: JSON.stringify({ id: bmId, first: 200, orderBy: 'MOST_RECENTLY_CREATED' }),
    },
    'business'
  );
  if (isGraphError(res)) throw new Error(res.message);
  return res;
}

async function fetchSystemUsers(bmId: string): Promise<AdminRecord[]> {
  const res = await graph<SystemUsersResponse>(`/${bmId}`, {
    params: { fields: 'system_users' },
    version: 'v25.0',
  });
  if (isGraphError(res)) return [];
  return (res.system_users?.data ?? []).map((item) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    email: '',
    type: 'SYSTEM',
    role: item.role ?? 'System',
    active: 'Active',
  }));
}

export async function fetchBmAdmins(bmId: string): Promise<BmRowPatch> {
  let people: PeopleResponse;
  try {
    people = await fetchPeopleViaGraphApi(bmId);
  } catch {
    people = await fetchPeopleViaBusinessGraphql(bmId);
  }

  const peopleUsers = parsePeople(people);
  const systemUsers = await fetchSystemUsers(bmId);
  const byId = new Map<string, AdminRecord>();
  for (const user of [...peopleUsers, ...systemUsers]) {
    if (user.id) byId.set(user.id, user);
  }
  const users = [...byId.values()];
  const fb = users.filter((user) => user.type === 'FACEBOOK').length;
  const ig = users.filter((user) => user.type === 'INSTAGRAM').length;
  const sys = users.filter((user) => user.type === 'SYSTEM').length;

  return {
    bmId,
    admin: `Admin ${users.length} - FB: ${fb} - IG: ${ig} - Sys: ${sys}`,
  };
}
