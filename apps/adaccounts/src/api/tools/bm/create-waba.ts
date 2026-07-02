import { graphql, extFetch, getToken, isGraphError } from '../../fb';

// API source of the WABA (WhatsApp Business Account) creation call. FB exposes
// several creation hosts; the user picks one per run (Xmeta-style):
//  4 = adsmanager graphql (most reliable), 2 = graph v17 batch,
//  0 / 3 = business graphql (doc didn't capture the host → test-live).
export type WabaApiMode = '0' | '2' | '3' | '4';

// Create-WABA GraphQL doc (shared across hosts per doc).
const CREATE_WABA_DOC_ID = '29701466519469036';

// A handful of plausible US legal/address sets. One is picked per run so repeated
// calls don't send identical data (mirrors the Xmeta random approach). FB only
// needs SOMETHING valid-looking to advance the eligibility gate.
const US_LEGAL_PRESETS = [
  {
    legal_name: 'Riverside Trading LLC',
    street: '742 Evergreen Terrace',
    city: 'Springfield',
    region: 'IL',
    postal: '62704',
    phone: '+12175550142',
  },
  {
    legal_name: 'Lakeview Ventures Inc',
    street: '1600 Pennsylvania Ave',
    city: 'Austin',
    region: 'TX',
    postal: '73301',
    phone: '+15125550199',
  },
  {
    legal_name: 'Summit Peak Group',
    street: '350 Fifth Avenue',
    city: 'Denver',
    region: 'CO',
    postal: '80202',
    phone: '+13035550123',
  },
] as const;

const COUNTRY_CODE = 'US';

function pickLegal() {
  // Vary by clock; no crypto needed — this is anti-duplication, not security.
  return US_LEGAL_PRESETS[Date.now() % US_LEGAL_PRESETS.length] ?? US_LEGAL_PRESETS[0];
}

function formEncode(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// One pipeline step: run a GraphQL doc on host business and report ok/message.
// `// test-live`: variables shape per step. Default success = !isGraphError;
// tighten with a positive marker once captured live.
async function step(
  label: string,
  friendly: string,
  docId: string,
  variables: Record<string, unknown>
): Promise<{ ok: boolean; message: string }> {
  const res = await graphql(
    {
      fb_api_req_friendly_name: friendly,
      doc_id: docId,
      variables: JSON.stringify(variables),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: `${label}: ${res.message}` };
  return { ok: true, message: `${label} ok` };
}

// Step 3 — create the WABA. The host branches by mode: doc captured host 4
// (adsmanager) and 2 (graph v17 batch); 0/3 had no host so we reuse business
// graphql with the same doc_id (heavily test-live, fall back to mode 4 if FB blocks).
async function createWabaStep(
  bmId: string,
  name: string,
  mode: WabaApiMode
): Promise<{ ok: boolean; message: string }> {
  const variables = JSON.stringify({
    input: { client_mutation_id: '1', business_id: bmId, name },
  });

  // mode 2: graph batch on graph.facebook.com/v17.0 — extFetch raw (the graphql()
  // helper hardcodes the /api/graphql/ path, so the batch endpoint needs raw
  // extFetch). Shape from doc → test-live ĐẬM.
  if (mode === '2') {
    let text: string;
    try {
      // getToken() inside try so a token-fetch failure returns a job error instead
      // of rejecting the whole run (never-throw).
      const { fb_dtsg, lsd, access_token, user_id } = await getToken();
      const batch = [
        {
          method: 'POST',
          // doc line 1043 — relative_url shape per captured doc → test-live.
          relative_url: `${bmId}/whatsapp_business_accounts?doc_id=${CREATE_WABA_DOC_ID}&name=${encodeURIComponent(name)}`,
        },
      ];
      text = await extFetch('https://graph.facebook.com/v17.0', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: formEncode({
          __user: user_id,
          fb_dtsg,
          lsd,
          access_token,
          batch: JSON.stringify(batch),
        }),
      });
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
    const hasError = /"error"|error_user_msg|"errorSummary"/.test(text);
    return hasError
      ? { ok: false, message: `Tạo WABA ${name} (API2) thất bại` }
      : { ok: true, message: `Đã tạo WABA ${name} trong BM ${bmId}` };
  }

  // mode 4: adsmanager graphql (doc line 1044, most reliable host).
  // mode 0/3: doc had no host → reuse business graphql, same doc_id (test-live).
  const host = mode === '4' ? 'adsmanager' : 'business';
  const res = await graphql(
    {
      fb_api_req_friendly_name: 'xfb_create_whatsapp_business_api_account',
      doc_id: CREATE_WABA_DOC_ID,
      variables,
    },
    host
  );
  if (isGraphError(res)) return { ok: false, message: `Tạo WABA ${name}: ${res.message}` };
  return { ok: true, message: `Đã tạo WABA ${name} trong BM ${bmId}` };
}

// Create one WABA inside one BM. 3-step sequential pipeline: accept the optimized
// delivery ToS, push US legal details through the eligibility gate, then create
// the WABA on the host selected by `mode`. Any step failing short-circuits and
// returns that step's message. Never throws. All payloads from the captured doc,
// NOT verified live → test-live.
export async function createWaba(
  bmId: string,
  opts: { name: string; mode: WabaApiMode }
): Promise<{ ok: boolean; message: string }> {
  const { name, mode } = opts;

  // Step 1 — accept the optimized-delivery API ToS (unlocks WABA creation).
  // test-live: variables shape (doc captured a GET graph graphql; we POST business
  // graphql for consistency — flip host if FB rejects).
  const s1 = await step(
    'B1 ToS',
    'useAcceptOptimizedDeliveryApiTosMutationMutation',
    '9763356653753255',
    { input: { client_mutation_id: '1', business_id: bmId } }
  );
  if (!s1.ok) return { ok: false, message: `BM ${bmId} · ${s1.message}` };

  // Step 2 — push US legal/business details (FB validates eligibility here).
  // Reuses the UpdateBusinessDetails shape from update-bm-legal.
  const legal = pickLegal();
  const s2 = await step(
    'B2 Update Details',
    'BizKitSettingsUpdateBusinessDetailsMutation',
    '10022067921177501',
    {
      input: {
        client_mutation_id: '1',
        business_id: bmId,
        business_profile: {
          legal_name: legal.legal_name,
          address: {
            street1: legal.street,
            city: legal.city,
            region: legal.region,
            postal_code: legal.postal,
            country_code: COUNTRY_CODE,
          },
          phone_number: legal.phone,
        },
      },
    }
  );
  if (!s2.ok) return { ok: false, message: `BM ${bmId} · ${s2.message}` };

  // Step 3 — create the WABA on the host chosen by mode.
  const s3 = await createWabaStep(bmId, name, mode);
  if (!s3.ok) return { ok: false, message: `BM ${bmId} · ${s3.message}` };

  return s3;
}
