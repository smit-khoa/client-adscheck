import { graph, graphql } from '../../fb';
import { getToken } from '../../fb';
import { isGraphError } from '../../fb';

// Leave (remove self from) one Business Manager. FB user: REST delete the logged-in
// user from the BM's business_users, GraphQL fallback on error. IG branch needs a
// businessUserID that we can't detect yet (payload not captured live), so it
// refuses clearly instead of guessing. Pure logic, never throws.

export type LeaveAccountKind = 'fb' | 'ig';

/**
 * Remove the logged-in user from one BM. `fb` runs the real REST delete (GraphQL
 * fallback); `ig` returns a clear "not implemented" error. Never throws.
 */
export async function leaveBm(
  bmId: string,
  kind: LeaveAccountKind = 'fb'
): Promise<{ ok: boolean; message: string }> {
  if (kind === 'ig') {
    return {
      ok: false,
      message: 'IG branch: chưa có logic detect businessUserID — cần capture live',
    };
  }

  const { user_id } = await getToken();

  // 1) REST: POST /<user_id>/businesses with method=delete removes self from the BM.
  const rest = await graph(`/${user_id}/businesses`, {
    method: 'POST',
    body: { method: 'delete', business: bmId },
    version: 'v17.0',
  });
  if (!isGraphError(rest)) return { ok: true, message: `Đã thoát BM ${bmId}` };

  // 2) Fallback GraphQL RemoveBusinessUserMutation. The exact variables shape isn't
  // captured live, so if FB rejects the payload we surface that error (REST stays
  // the primary path; this only runs when REST already failed).
  const gql = await graphql(
    {
      fb_api_req_friendly_name: 'RemoveBusinessUserMutation',
      doc_id: '23932916982960697',
      variables: JSON.stringify({ business_id: bmId, business_user_id: user_id }),
    },
    'business'
  );
  if (!isGraphError(gql)) return { ok: true, message: `Đã thoát BM ${bmId}` };

  return { ok: false, message: `${gql.message} (REST: ${rest.message})` };
}
