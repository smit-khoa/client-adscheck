import { graph, graphql, isGraphError } from '../../fb';
import { ADMIN_TASKS, EMPLOYEE_TASKS } from './share-bm-users';

// List + manage BM admins (business users) for one BM. Used by the
// manage-bm-admins viewer dialog. List is REST; role changes + remove are
// GraphQL. Payloads from the captured doc, NOT verified live → test-live.
// Never throws — callers toast the returned message.

export interface BmAdminRow {
  id: string;
  name: string;
  email: string;
  role: string;
  // Index signature so the row is assignable to the dialog's generic ViewerRow
  // (Record<string, string | number>) — the Table renders rows by column field.
  [key: string]: string | number;
}

interface ListAdminsResponse {
  data?: Array<{ id?: string; name?: string; email?: string; role?: string }>;
}

// List business users of one BM. REST GET /<bm>/business_users with the fields we
// render. test-live: whether a BUSINESS_MANAGER-scoped token is required (Adscheck
// uses one); if the list comes back empty/forbidden, that's the first thing to check.
export async function listBmAdmins(
  bmId: string
): Promise<{ ok: true; rows: BmAdminRow[] } | { ok: false; message: string }> {
  const res = await graph<ListAdminsResponse>(`/${bmId}/business_users`, {
    params: { fields: 'email,name,id,role', limit: 300 },
  });
  if (isGraphError(res)) return { ok: false, message: res.message };

  const rows: BmAdminRow[] = (res.data ?? [])
    .filter((u) => u.id)
    .map((u) => ({
      id: String(u.id),
      name: u.name ?? '(không tên)',
      email: u.email ?? '',
      role: u.role ?? '',
    }));
  return { ok: true, rows };
}

// Remove one business user from a BM. GraphQL RemoveBusinessUserMutation primary;
// on error fall back to the REST business_remove_admin endpoint. test-live:
// variables shape + REST fallback body. Never throws.
export async function removeBmAdmin(
  bmId: string,
  userId: string
): Promise<{ ok: boolean; message: string }> {
  const gql = await graphql(
    {
      fb_api_req_friendly_name: 'RemoveBusinessUserMutation',
      doc_id: '23932916982960697',
      variables: JSON.stringify({
        input: { client_mutation_id: '1', business_id: bmId, user_id: userId },
      }),
    },
    'business'
  );
  if (!isGraphError(gql)) return { ok: true, message: `Đã xóa user ${userId}` };

  // Fallback REST business_remove_admin.
  const rest = await graph(`/${bmId}/business_remove_admin`, {
    method: 'POST',
    body: { user: userId },
  });
  if (!isGraphError(rest)) return { ok: true, message: `Đã xóa user ${userId} (REST)` };

  return { ok: false, message: `${userId}: ${gql.message} (REST: ${rest.message})` };
}

// Set one user's role: 'admin' = full admin (promote), 'employee' = staff (demote).
// GraphQL BusinessAccountPermissionTasksForUserModalMutation. Promote/demote use
// different doc_ids per the doc. test-live: variables shape + the promote task set.
export async function setBmAdminRole(
  bmId: string,
  userId: string,
  role: 'admin' | 'employee'
): Promise<{ ok: boolean; message: string }> {
  const isPromote = role === 'admin';
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'BusinessAccountPermissionTasksForUserModalMutation',
      doc_id: isPromote ? '7706501459456230' : '7337443546298507',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          business_id: bmId,
          user_id: userId,
          // Promote/demote reuse the same task ids as the share-BM-user flow, so the
          // viewer dialog cannot report success while sending an empty task set.
          business_roles: isPromote ? ADMIN_TASKS : EMPLOYEE_TASKS,
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${userId}: ${res.message}` };
  return {
    ok: true,
    message: isPromote ? `Đã nâng user ${userId} lên QTV` : `Đã hạ user ${userId} xuống NV`,
  };
}
