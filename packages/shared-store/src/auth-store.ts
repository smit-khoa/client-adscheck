import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  ActivateSessionResponse,
  AdscheckAuthResponse,
  AdscheckFeature,
  AdscheckManager,
  AdscheckProductResponse,
  AuthenticationResponse,
  User,
} from "@mf2/shared-types";
import { api, ApiError, setUnauthorizedHandler } from "./api-client";

declare const __DASHBOARD_URL__: string;
const DASHBOARD_URL =
  typeof __DASHBOARD_URL__ !== "undefined"
    ? __DASHBOARD_URL__
    : "https://dashboard.smit.vn";

const NORMAL_SESSION_KEY = "setting_use_free";

let hydrate_promise: Promise<void> | null = null;
let entitlements_promise: Promise<void> | null = null;

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const is_loading = ref(true);
  const is_authenticated = ref(false);
  const auth_checked = ref(false);
  const last_visit = ref<string | null>(null);
  // Set when startup auth fails for a transient reason (network/timeout). The app
  // still mounts; callers can decide whether to show a retry affordance later.
  const auth_error = ref(false);
  const adscheck_manager = ref<AdscheckManager | null>(null);
  const adscheck_features = ref<AdscheckFeature[]>([]);
  const adscheck_products = ref<AdscheckProductResponse | null>(null);
  const entitlements_checked = ref(false);
  const entitlements_loading = ref(false);
  const entitlements_error = ref(false);
  const use_normal_session = ref(readNormalSessionChoice());

  const is_pro_session_active = computed(
    () => adscheck_manager.value?.session_actived === true
  );

  function readNormalSessionChoice(): boolean {
    return globalThis.localStorage?.getItem(NORMAL_SESSION_KEY) === "1";
  }

  function applyAuthentication(data: AuthenticationResponse): void {
    last_visit.value = data.last_visit ?? null;
    const authenticated = data.isLogin !== false && data.user != null;
    user.value = authenticated ? data.user! : null;
    is_authenticated.value = authenticated;
    if (!authenticated) clearAdscheckSession();
  }

  function mapFeatures(features: AdscheckFeature[] | undefined): AdscheckFeature[] {
    return (features ?? []).map((feature) => ({
      ...feature,
      usable: !feature.has_expired,
    }));
  }

  async function hydrateUser(): Promise<void> {
    if (hydrate_promise) return hydrate_promise;
    auth_error.value = false;

    const run = (async () => {
      is_loading.value = true;
      try {
        const data = await api<AuthenticationResponse>({
          url: "/public/authentication",
          suppress_unauthorized_handler: true,
        });
        applyAuthentication(data);
      } catch (err) {
        if (err instanceof ApiError && err.is_transient) auth_error.value = true;
        user.value = null;
        is_authenticated.value = false;
        last_visit.value = null;
        clearAdscheckSession();
      } finally {
        auth_checked.value = true;
        is_loading.value = false;
        hydrate_promise = null;
      }
    })();

    hydrate_promise = run;
    return run;
  }

  async function fetchEntitlements(): Promise<void> {
    if (!is_authenticated.value) {
      clearAdscheckSession();
      entitlements_checked.value = true;
      return;
    }

    entitlements_loading.value = true;
    entitlements_error.value = false;
    try {
      const [auth, products] = await Promise.all([
        api<AdscheckAuthResponse>({ url: "/ads-check/auth" }),
        api<AdscheckProductResponse>({ url: "/ads-check/product" }),
      ]);

      adscheck_manager.value = auth;
      adscheck_features.value = mapFeatures(auth.features);
      adscheck_products.value = products;
      entitlements_checked.value = true;
    } catch {
      adscheck_manager.value = null;
      adscheck_features.value = [];
      adscheck_products.value = null;
      entitlements_error.value = true;
      entitlements_checked.value = true;
    } finally {
      entitlements_loading.value = false;
    }
  }

  async function loadEntitlements(): Promise<void> {
    if (entitlements_promise) return entitlements_promise;
    entitlements_promise = fetchEntitlements().finally(() => {
      entitlements_promise = null;
    });
    return entitlements_promise;
  }

  async function refreshEntitlements(): Promise<void> {
    if (entitlements_promise) await entitlements_promise;
    await fetchEntitlements();
  }

  async function activateProSession(): Promise<boolean> {
    try {
      const response = await api<ActivateSessionResponse>({
        url: "/ads-check/sessions/active",
        method: "POST",
      });
      if (!response.success) return false;

      use_normal_session.value = false;
      globalThis.localStorage?.setItem(NORMAL_SESSION_KEY, "0");
      adscheck_manager.value = {
        ...(adscheck_manager.value ?? {}),
        session_actived: true,
        session_used:
          typeof adscheck_manager.value?.session_used === "number"
            ? adscheck_manager.value.session_used + 1
            : adscheck_manager.value?.session_used,
      };
      return true;
    } catch {
      return false;
    }
  }

  function useNormalSession(): void {
    use_normal_session.value = true;
    globalThis.localStorage?.setItem(NORMAL_SESSION_KEY, "1");
  }

  function trackLastVisit(product: string): void {
    api({ url: "/public/last-visit", method: "POST", data: { last_visit: product } }).catch(() => {});
  }

  function clearAdscheckSession(): void {
    entitlements_promise = null;
    adscheck_manager.value = null;
    adscheck_features.value = [];
    adscheck_products.value = null;
    entitlements_checked.value = false;
    entitlements_loading.value = false;
    entitlements_error.value = false;
  }

  function logout(): void {
    hydrate_promise = null;
    user.value = null;
    is_authenticated.value = false;
    auth_checked.value = false;
    last_visit.value = null;
    clearAdscheckSession();
    window.location.href = `${DASHBOARD_URL}/signin?referer=${encodeURIComponent(
      window.location.href
    )}`;
  }

  // Centralized 401: expired-session responses still trigger one logout. Startup
  // auth opts out per call so unauthenticated startup can be represented as state.
  setUnauthorizedHandler(() => logout());

  return {
    user,
    is_loading,
    is_authenticated,
    auth_checked,
    last_visit,
    auth_error,
    adscheck_manager,
    adscheck_features,
    adscheck_products,
    entitlements_checked,
    entitlements_loading,
    entitlements_error,
    use_normal_session,
    is_pro_session_active,
    hydrateUser,
    loadEntitlements,
    refreshEntitlements,
    activateProSession,
    useNormalSession,
    trackLastVisit,
    clearAdscheckSession,
    logout,
  };
});
