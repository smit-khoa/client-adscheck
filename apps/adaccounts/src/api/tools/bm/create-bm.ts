import { graphql } from '../../fb';
import { extFetch } from '../../fb';
import { getToken } from '../../fb';
import { isGraphError } from '../../fb';

// Create a new Business Manager. `over` uses the REST create_account endpoint; the
// other five modes are internal GraphQL CreateBusiness mutations (captured live).
// All return { ok, message } and never throw.

export type CreateBmMode = '350' | '50' | 'over' | 'api1' | 'api2' | 'api3';

// GraphQL create-BM mutations, captured from the live FB UI. Three payload shapes:
// - 350: business_name only (geo BM creation)
// - 50: + seed admin, creation_source MBS_..._PROMINENT_HOME_CARD
// - api1/2/3: + seed admin, creation_source ..._IN_SCOPE_SELECTOR + entry_point.
//   All three share the SAME doc_id + variables shape — FB just invokes them from
//   different surfaces; only api2 sends a friendly_name (logging only, no effect).
interface GqlMode {
  doc_id: string;
  friendly_name?: string;
  withSeedAdmin: boolean; // 350 omits the seed-admin fields
  creation_source?: string;
  entry_point?: string;
}

const IN_SCOPE: Omit<GqlMode, 'friendly_name'> = {
  doc_id: '7780408488685584',
  withSeedAdmin: true,
  creation_source: 'BM_HOME_BUSINESS_CREATION_IN_SCOPE_SELECTOR',
  entry_point: 'UNIFIED_GLOBAL_SCOPE_SELECTOR',
};

const GQL_MODES: Record<Exclude<CreateBmMode, 'over'>, GqlMode> = {
  '350': {
    doc_id: '5232196050177866',
    friendly_name: 'FBEGeoBMCreation_CreateBusinessMutation',
    withSeedAdmin: false,
  },
  '50': {
    doc_id: '7183377418404152',
    withSeedAdmin: true,
    creation_source: 'MBS_BUSINESS_CREATION_PROMINENT_HOME_CARD',
  },
  api1: { ...IN_SCOPE },
  api2: { ...IN_SCOPE, friendly_name: 'useBusinessCreationMutationMutation' },
  api3: { ...IN_SCOPE },
};

const CREATE_ACCOUNT_URL = 'https://business.facebook.com/business/create_account';

function rand6(): string {
  return Array.from(
    { length: 6 },
    () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
}

// Seed-admin email is throwaway and must be unique per create so repeated runs to
// the same FB account don't collide on an existing invite.
function randomEmail(): string {
  return `via_${Date.now()}_${rand6()}@gmail.com`;
}

function formEncode(obj: Record<string, string | number>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

// GraphQL branch: build the `input` from the mode config + actor_id (logged-in
// user). graphql() adds fb_dtsg/lsd and surfaces FB errors as a GraphError.
async function createViaGraphql(
  name: string,
  cfg: GqlMode
): Promise<{ ok: boolean; message: string }> {
  const { user_id } = await getToken();

  const input: Record<string, string> = {
    client_mutation_id: '1',
    actor_id: user_id,
    business_name: name,
  };
  if (cfg.withSeedAdmin) {
    // FB UI seeds first/last name with the business name; email is a throwaway.
    input.user_first_name = name;
    input.user_last_name = name;
    input.user_email = randomEmail();
  }
  if (cfg.creation_source) input.creation_source = cfg.creation_source;
  if (cfg.entry_point) input.entry_point = cfg.entry_point;

  const res = await graphql(
    {
      ...(cfg.friendly_name ? { fb_api_req_friendly_name: cfg.friendly_name } : {}),
      doc_id: cfg.doc_id,
      variables: JSON.stringify({ input }),
    },
    'business'
  );
  if (isGraphError(res)) return { ok: false, message: res.message };
  return { ok: true, message: `Đã tạo BM "${name}"` };
}

/**
 * Create one BM named `name` using `mode`. `over` = REST create; the rest =
 * GraphQL CreateBusiness mutations. Never throws.
 */
export async function createBm(
  name: string,
  mode: CreateBmMode
): Promise<{ ok: boolean; message: string }> {
  if (mode !== 'over') return createViaGraphql(name, GQL_MODES[mode]);

  // over — REST create_account on the business host (NOT graph.facebook.com, so
  // it can't go through graph()). Build a form POST with fb_dtsg from the token.
  const { fb_dtsg } = await getToken();
  const body = formEncode({
    brand_name: name,
    first_name: 'Admin',
    last_name: rand6(),
    email: randomEmail(),
    timezone_id: 140,
    business_category: 'OTHER',
    fb_dtsg,
  });

  let text: string;
  try {
    text = await extFetch(CREATE_ACCOUNT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }

  // Success when the response carries a created business id and no error marker.
  // No confirmable id → treat as failure so the per-row result is truthful rather
  // than optimistically green.
  const hasError = /"error"|error_user_msg|"errorSummary"/.test(text);
  const businessId = text.match(/"(?:business_id|id)"\s*:\s*"(\d+)"/)?.[1];
  if (!hasError && businessId) {
    return { ok: true, message: `Đã tạo BM "${name}" (${businessId})` };
  }
  return { ok: false, message: `Không xác nhận được tạo BM "${name}"` };
}
