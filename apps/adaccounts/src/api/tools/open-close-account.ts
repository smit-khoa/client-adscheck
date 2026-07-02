import { graphql, responseHasMarker } from '../fb-graph';
import { getToken } from '../fb-token';
import { isGraphError } from '../types';
import type { ToolRunner } from './index';

// Open (reactivate) / close (deactivate) an ad account via the internal GraphQL
// endpoint. doc_ids from the reference FB-automation tooling:
// - deactivate: BizKitSettingsDeactivateAdAccountMutation (business host)
// - reactivate: useBillingReactivateAdAccountMutation (adsmanager host)

const CLOSE_DOC_ID = '9895135750555877';
const OPEN_DOC_ID = '9984888131552276';

export const openCloseAccount: ToolRunner = async (account, values) => {
  const mode = values.mode === 'open' ? 'open' : 'close';
  // GraphQL mutations use the bare numeric id, not the act_ prefix.
  const adAccountID = account.id.startsWith('act_') ? account.id.slice(4) : account.id;

  if (mode === 'close') {
    const res = await graphql<{ data?: { business_settings_deactivate_ad_account?: unknown } }>(
      {
        fb_api_req_friendly_name: 'BizKitSettingsDeactivateAdAccountMutation',
        doc_id: CLOSE_DOC_ID,
        variables: JSON.stringify({ adAccountID }),
      },
      'business'
    );
    if (isGraphError(res)) return { ok: false, message: res.message };
    if (res?.data?.business_settings_deactivate_ad_account) {
      // status 101 = "Đóng" (closed) so the list/cache reflect it without refetch.
      return { ok: true, message: 'Đã đóng tài khoản', patch: { status: 101 } };
    }
    return { ok: false, message: 'Đóng tài khoản thất bại' };
  }

  // open / reactivate — actor_id is the logged-in FB user id (from the token).
  const { user_id } = await getToken();
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'useBillingReactivateAdAccountMutation',
      doc_id: OPEN_DOC_ID,
      variables: JSON.stringify({
        input: {
          billable_account_payment_legacy_account_id: adAccountID,
          actor_id: user_id,
          client_mutation_id: '1',
        },
      }),
    },
    'adsmanager'
  );
  if (isGraphError(res)) return { ok: false, message: res.message };
  if (responseHasMarker(res, 'ADMARKET_ACCOUNT_STATUS_ACTIVE')) {
    // status 1 = "Hoạt động" (active) so the list/cache reflect it without refetch.
    return { ok: true, message: 'Đã mở tài khoản', patch: { status: 1 } };
  }
  // No active-status marker and no error → can't confirm. Treat as failure so
  // the per-row result is truthful rather than optimistic.
  return { ok: false, message: 'Không xác nhận được mở tài khoản' };
};
