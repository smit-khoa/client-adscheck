import { graph, graphql } from '../../fb';
import { isGraphError } from '../../fb';

// Add one person (by email) to one Business Manager with an admin/employee role.
// REST POST /<bm_id>/business_users is the primary path; on any error we fall
// back to the internal GraphQL ManageBusinessAccountAddPersonMutation. Pure
// logic — no UI imports. Reuses graph()/graphql() (auth + retry handled there).

export type ShareRole = 'admin' | 'employee';

export interface ShareBmResult {
  ok: boolean;
  message: string;
}

// REST `roles` is a JSON array of enum values, NOT a CSV string (singular `role`
// rejects a comma-joined list — each value must match the enum). Verified live:
// the working call sends roles=["DEFAULT",...] plus brandId. QTV (admin) = the
// full task list; NV (employee) = EMPLOYEE only.
const ADMIN_ROLES = [
  'DEFAULT', 'MANAGE', 'DEVELOPER', 'EMPLOYEE', 'ASSET_MANAGE', 'ASSET_VIEW',
  'PEOPLE_MANAGE', 'PEOPLE_VIEW', 'PARTNERS_VIEW', 'PARTNERS_MANAGE', 'PROFILE_MANAGE',
];
const EMPLOYEE_ROLES = ['EMPLOYEE'];

// GraphQL fallback — business_roles is an array of task IDs.
export const ADMIN_TASKS = ['864195700451909', '151821535410699', '610690166001223', '186595505260379'];
export const EMPLOYEE_TASKS = ['926381894526285'];

/** Add 1 email to 1 BM. REST primary; on error → GraphQL fallback. Never throws. */
export async function shareBmUser(
  bmId: string,
  email: string,
  role: ShareRole
): Promise<ShareBmResult> {
  // 1) REST: POST /<bm_id>/business_users — `roles` as a JSON array + `brandId`.
  const restRoles = role === 'admin' ? ADMIN_ROLES : EMPLOYEE_ROLES;
  const rest = await graph<{ id?: string }>(`/${bmId}/business_users`, {
    method: 'POST',
    body: { email, roles: JSON.stringify(restRoles), brandId: bmId },
  });
  if (!isGraphError(rest)) return { ok: true, message: `REST ok · ${email}` };

  // 2) Fallback GraphQL ManageBusinessAccountAddPersonMutation
  const tasks = role === 'admin' ? ADMIN_TASKS : EMPLOYEE_TASKS;
  const gql = await graphql(
    {
      fb_api_req_friendly_name: 'ManageBusinessAccountAddPersonMutation',
      doc_id: '6237475453040720',
      variables: JSON.stringify({
        business_emails: [email],
        business_roles: tasks,
        business_id: bmId,
        invite_origin_surface: 'MBS_INVITE_USER_FLOW',
      }),
    },
    'business'
  );
  if (!isGraphError(gql)) return { ok: true, message: `GraphQL ok · ${email}` };

  // both failed → return the GraphQL message (more specific) with REST for debug
  return { ok: false, message: `${gql.message} (REST: ${rest.message})` };
}
