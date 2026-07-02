import { graphql, isGraphError } from '../../fb';

// Enable Monthly Invoicing (credit sharing) for one BM. The flow is a 4-step
// sequential pipeline on host business — each step gates the next, so a failure
// stops the pipeline and returns the failing step's message (never throws).
//
// Legal/billing info is hardcoded random Philippines (Xmeta-style: FB only needs
// SOMETHING valid-looking to advance the flow). Owner is a fixed business id.
// All payloads come from the captured doc, NOT verified live → test-live.

// Fixed owner business id used as the finance-editor org owner (from doc).
const OWNER_BUSINESS_ID = '286308374826494';

// A handful of plausible Philippines legal/address sets. One is picked per run so
// repeated calls don't send identical data (mirrors the Xmeta random approach).
const PH_LEGAL_PRESETS = [
  {
    legal_name: 'Maria Santos Trading',
    street: '12 Mabini Street',
    city: 'Quezon City',
    state: 'Metro Manila',
    postal: '1100',
    phone: '+639171234567',
  },
  {
    legal_name: 'Jose Rizal Enterprises',
    street: '88 Rizal Avenue',
    city: 'Makati',
    state: 'Metro Manila',
    postal: '1200',
    phone: '+639189876543',
  },
  {
    legal_name: 'Bonifacio Ventures',
    street: '45 Bonifacio Drive',
    city: 'Cebu City',
    state: 'Cebu',
    postal: '6000',
    phone: '+639175551212',
  },
] as const;

const COUNTRY_CODE = 'PH';

function pickLegal() {
  // Vary by clock; no crypto needed — this is anti-duplication, not security.
  return PH_LEGAL_PRESETS[Date.now() % PH_LEGAL_PRESETS.length] ?? PH_LEGAL_PRESETS[0];
}

// One pipeline step: run a GraphQL doc on host business and report ok/message.
// `// test-live`: variables shape per step + per-step success marker. Default
// success = !isGraphError; tighten with responseHasMarker once captured live.
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

// Enable monthly invoicing for one BM. Runs the 4 steps in order; the first
// failing step short-circuits and its message is returned. Never throws.
export async function enableMonthlyInvoicing(
  bmId: string
): Promise<{ ok: boolean; message: string }> {
  const legal = pickLegal();

  // Step 1 — assign the finance editor (grants the org permission to proceed).
  // test-live: variables shape (business_id vs org id, owner field name).
  const s1 = await step(
    'B1 finance editor',
    'useBillingMIAssignFinanceEditorMutation',
    '9920076704725203',
    {
      input: {
        client_mutation_id: '1',
        business_id: bmId,
        owner_business_id: OWNER_BUSINESS_ID,
      },
    }
  );
  if (!s1.ok) return { ok: false, message: `BM ${bmId} · ${s1.message}` };

  // Step 2 — read the org state decision (query; advances the wizard state).
  // test-live: exact variable name(s) FB expects for the org id.
  const s2 = await step(
    'B2 org state',
    'BillingCreditSharingShowOrgStateDecisionStateQuery',
    '27167702486188107',
    { business_id: bmId }
  );
  if (!s2.ok) return { ok: false, message: `BM ${bmId} · ${s2.message}` };

  // Step 3 — load the legal-info screen (query; FB validates eligibility here).
  // test-live: variable name(s).
  const s3 = await step(
    'B3 legal screen',
    'BillingCreditSharingCollectLegalInfoScreenQuery',
    '36430864776512915',
    { business_id: bmId }
  );
  if (!s3.ok) return { ok: false, message: `BM ${bmId} · ${s3.message}` };

  // Step 4 — submit the billing address / legal info (commits the flow).
  // test-live: the legal/address field names + which the API actually requires.
  const s4 = await step(
    'B4 billing address',
    'useBillingCreditSharingCollectBillingAddressMutation',
    '27043471955294112',
    {
      input: {
        client_mutation_id: '1',
        business_id: bmId,
        legal_entity_name: legal.legal_name,
        address: {
          street1: legal.street,
          city: legal.city,
          region: legal.state,
          postal_code: legal.postal,
          country_code: COUNTRY_CODE,
        },
        phone_number: legal.phone,
      },
    }
  );
  if (!s4.ok) return { ok: false, message: `BM ${bmId} · ${s4.message}` };

  return { ok: true, message: `Đã kích Info BM ${bmId} (Monthly Invoicing)` };
}
