import { graphql, isGraphError } from '../../fb';

// One billing account row from BillingHubAccountsViewQuery.
interface BillingAccount {
  id: string;
}

// Nested response shape of the billing-accounts list. The exact path is unknown
// (doc didn't capture it) → we probe a few plausible containers and fall back to
// empty. test-live: confirm the real account-array path + id field.
interface BillingHubResponse {
  data?: {
    business?: {
      billing_accounts?: { nodes?: BillingAccount[]; data?: BillingAccount[] };
    };
    billing_accounts?: { nodes?: BillingAccount[]; data?: BillingAccount[] };
  };
}

// Fake billing info to force a read-only (WhatsApp-billing) ad account to show
// again. FB only needs a valid-looking update to flip visibility — values are
// placeholder. test-live: which billing fields the mutation actually requires.
const FAKE_BILLING = {
  legal_entity_name: 'Riverside Trading LLC',
  address: {
    street1: '742 Evergreen Terrace',
    city: 'Springfield',
    region: 'IL',
    postal_code: '62704',
    country_code: 'US',
  },
} as const;

// Pull the account array out of whatever container FB nests it in. Returns
// `matched=false` when none of the probed containers exist — so a misparsed
// response (real shape differs from the test-live guesses) is reported as a
// warning, NOT a silent "empty → success". test-live marker.
function parseAccounts(res: BillingHubResponse): { accounts: BillingAccount[]; matched: boolean } {
  const b = res.data?.business?.billing_accounts ?? res.data?.billing_accounts;
  if (!b) return { accounts: [], matched: false };
  return { accounts: b.nodes ?? b.data ?? [], matched: true };
}

// Force read-only ad accounts in one BM to show again. Lists the BM's billing
// accounts, then pushes a fake billing-info update per account to flip visibility.
// 1 call per BM (runner gives one job/BM). Empty list → no-op success. Update
// errors aggregate (never throw). All payloads from the captured doc, NOT verified
// live → test-live.
export async function showReadonlyAdAccount(
  bmId: string
): Promise<{ ok: boolean; message: string; warn?: boolean }> {
  // 1) List billing accounts for the BM.
  const list = await graphql<BillingHubResponse>(
    {
      fb_api_req_friendly_name: 'BillingHubAccountsViewQuery',
      doc_id: '33952353404408520',
      variables: JSON.stringify({ business_id: bmId }), // test-live: variable name
    },
    'business'
  );
  if (isGraphError(list)) return { ok: false, message: list.message };

  const { accounts, matched } = parseAccounts(list);
  // No container matched → likely a misparse of the unverified response shape, not
  // a genuine empty list. Surface as warn so it isn't mistaken for success.
  if (!matched) {
    return { ok: false, warn: true, message: `BM ${bmId}: không đọc được danh sách billing (test-live shape)` };
  }
  if (accounts.length === 0) {
    return { ok: true, message: `BM ${bmId}: không có TK read-only` };
  }

  // 2) Push fake billing info per account to force visibility. HTTP 200 + nested
  // error → !isGraphError default; tighten with a marker once captured live.
  let shown = 0;
  const errors: string[] = [];
  for (const a of accounts) {
    const res = await graphql(
      {
        fb_api_req_friendly_name: 'BillingAccountInformationUtilsUpdateAccountMutation',
        doc_id: '25847826658142446',
        variables: JSON.stringify({
          input: { client_mutation_id: '1', account_id: a.id, ...FAKE_BILLING },
        }),
      },
      'business'
    );
    if (isGraphError(res)) errors.push(`${a.id}: ${res.message}`);
    else shown += 1;
  }

  const ok = errors.length === 0;
  return {
    ok,
    message: ok
      ? `Đã hiện ${shown}/${accounts.length} TKQC`
      : `Hiện ${shown}/${accounts.length}; lỗi: ${errors.join(' | ')}`,
  };
}
