import { graphql, getToken, isGraphError } from '../../fb';

// Opt the current user OUT of the new BM Console (revert to the old FB interface).
// Per-user setting — NOT per BM. GraphQL doc_id 8398852550167223. friendly_name
// not in doc → omit (delete-bm sends doc_id bare too). Payload from doc, not
// verified live → test-live. Never throws.
export async function optOutBmConsole(): Promise<{ ok: boolean; message: string }> {
  const { user_id } = await getToken();
  const res = await graphql(
    {
      doc_id: '8398852550167223',
      variables: JSON.stringify({
        input: {
          client_mutation_id: '1',
          actor_id: user_id,
          bmc_optin_status: 'OPT_OUT',
        },
      }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: res.message };
  // No positive marker documented → rely on isGraphError. If test-live shows FB
  // returns HTTP 200 + nested error, add a nested-parse/marker later (like claim-page).
  return { ok: true, message: 'Đã chuyển về giao diện cũ (opt-out BM Console)' };
}
