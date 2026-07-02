// auth-store is a MF singleton — one instance shared by every remote. These tests
// pin the single startup auth flow: response normalization, one-shot hydration,
// loading flags, and logout cleanup. The network layer is mocked module-wide.

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

const { ApiError } = await vi.importActual<typeof import("../api-client")>("../api-client")
const apiMock = vi.fn()
vi.mock("../api-client", async () => {
    const actual = await vi.importActual<typeof import("../api-client")>("../api-client")
    return {
        ...actual,
        api: (...args: unknown[]) => apiMock(...args),
        setUnauthorizedHandler: vi.fn()
    }
})

import { useAuthStore } from "../auth-store"

beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
    localStorage.clear()
    Object.defineProperty(window, "location", {
        value: { href: "http://localhost/" },
        writable: true,
        configurable: true
    })
    useAuthStore().logout()
    apiMock.mockReset()
})

describe("hydrateUser", () => {
    it("hydrates screenshot-shaped auth response", async () => {
        apiMock.mockResolvedValueOnce({
            isLogin: true,
            last_visit: "ads-check",
            user: { id: "u1", name: "Khoa Đặng", role: "dev", balance: 0 }
        })
        const store = useAuthStore()

        await store.hydrateUser()

        expect(store.user).toEqual({ id: "u1", name: "Khoa Đặng", role: "dev", balance: 0 })
        expect(store.is_authenticated).toBe(true)
        expect(store.auth_checked).toBe(true)
        expect(store.is_loading).toBe(false)
        expect(store.auth_error).toBe(false)
        expect(store.last_visit).toBe("ads-check")
        expect(apiMock).toHaveBeenCalledTimes(1)
        expect(apiMock.mock.calls[0]?.[0]).toMatchObject({
            url: "/public/authentication",
            suppress_unauthorized_handler: true
        })
    })

    it("accepts the legacy { user } response shape", async () => {
        apiMock.mockResolvedValueOnce({ user: { id: "u1" } })
        const store = useAuthStore()

        await store.hydrateUser()

        expect(store.user).toEqual({ id: "u1" })
        expect(store.is_authenticated).toBe(true)
    })

    it("treats missing or null users as unauthenticated", async () => {
        const store = useAuthStore()

        apiMock.mockResolvedValueOnce({ isLogin: true, user: null })
        await store.hydrateUser()
        expect(store.user).toBeNull()
        expect(store.is_authenticated).toBe(false)

        apiMock.mockResolvedValueOnce({ isLogin: false, user: { id: "u1" } })
        await store.hydrateUser()
        expect(store.user).toBeNull()
        expect(store.is_authenticated).toBe(false)
    })

    it("marks auth checked and loading false after handled auth failures", async () => {
        apiMock.mockRejectedValueOnce(new ApiError(401, "expired", null, "auth"))
        const store = useAuthStore()

        await store.hydrateUser()

        expect(store.auth_checked).toBe(true)
        expect(store.is_loading).toBe(false)
        expect(store.auth_error).toBe(false)
        expect(store.user).toBeNull()
        expect(store.is_authenticated).toBe(false)
    })

    it("marks transient failures without blocking app mount", async () => {
        apiMock.mockRejectedValueOnce(new ApiError(0, "timeout", null, "timeout"))
        const store = useAuthStore()

        await store.hydrateUser()

        expect(store.auth_error).toBe(true)
        expect(store.auth_checked).toBe(true)
        expect(store.is_loading).toBe(false)
        expect(store.user).toBeNull()
        expect(store.is_authenticated).toBe(false)
    })

    it("dedupes concurrent hydrate calls", async () => {
        apiMock.mockResolvedValueOnce({ user: { id: "u1" } })
        const store = useAuthStore()

        await Promise.all([store.hydrateUser(), store.hydrateUser()])

        expect(apiMock).toHaveBeenCalledTimes(1)
        expect(store.user).toEqual({ id: "u1" })
    })
})

describe("loadEntitlements", () => {
    it("does not call Adscheck entitlement APIs when unauthenticated", async () => {
        const store = useAuthStore()

        await store.loadEntitlements()

        expect(apiMock).not.toHaveBeenCalled()
        expect(store.adscheck_manager).toBeNull()
        expect(store.adscheck_features).toEqual([])
        expect(store.entitlements_checked).toBe(true)
    })

    it("loads auth and products for authenticated users", async () => {
        apiMock
            .mockResolvedValueOnce({ user: { id: "u1" } })
            .mockResolvedValueOnce({
                success: true,
                session_actived: false,
                session_used: 1,
                features: [
                    { code: "alive", has_expired: false },
                    { code: "expired", has_expired: true }
                ]
            })
            .mockResolvedValueOnce({ success: true, plans: [] })
        const store = useAuthStore()

        await store.hydrateUser()
        await store.loadEntitlements()

        expect(apiMock.mock.calls.slice(1).map((call) => call[0])).toEqual([
            { url: "/ads-check/auth" },
            { url: "/ads-check/product" }
        ])
        expect(store.adscheck_manager?.session_actived).toBe(false)
        expect(store.is_pro_session_active).toBe(false)
        expect(store.adscheck_features).toEqual([
            { code: "alive", has_expired: false, usable: true },
            { code: "expired", has_expired: true, usable: false }
        ])
        expect(store.adscheck_products).toEqual({ success: true, plans: [] })
        expect(store.entitlements_checked).toBe(true)
        expect(store.entitlements_error).toBe(false)
    })

    it("dedupes concurrent entitlement loads", async () => {
        apiMock
            .mockResolvedValueOnce({ user: { id: "u1" } })
            .mockResolvedValueOnce({ success: true, features: [] })
            .mockResolvedValueOnce({ success: true })
        const store = useAuthStore()

        await store.hydrateUser()
        await Promise.all([store.loadEntitlements(), store.loadEntitlements()])

        expect(apiMock).toHaveBeenCalledTimes(3)
        expect(apiMock.mock.calls[1]?.[0]).toEqual({ url: "/ads-check/auth" })
        expect(apiMock.mock.calls[2]?.[0]).toEqual({ url: "/ads-check/product" })
    })

    it("marks entitlement errors without clearing SMIT auth", async () => {
        apiMock
            .mockResolvedValueOnce({ user: { id: "u1" } })
            .mockRejectedValueOnce(new ApiError(500, "failed"))
            .mockResolvedValueOnce({ success: true })
        const store = useAuthStore()

        await store.hydrateUser()
        await store.loadEntitlements()

        expect(store.user).toEqual({ id: "u1" })
        expect(store.is_authenticated).toBe(true)
        expect(store.adscheck_manager).toBeNull()
        expect(store.adscheck_features).toEqual([])
        expect(store.entitlements_checked).toBe(true)
        expect(store.entitlements_error).toBe(true)
    })
})

describe("Adscheck session actions", () => {
    it("activates pro session and updates counters", async () => {
        apiMock
            .mockResolvedValueOnce({ user: { id: "u1" } })
            .mockResolvedValueOnce({ success: true, session_actived: false, session_used: 2, features: [] })
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ success: true })
        const store = useAuthStore()

        await store.hydrateUser()
        await store.loadEntitlements()
        const ok = await store.activateProSession()

        expect(ok).toBe(true)
        expect(apiMock.mock.calls[3]?.[0]).toEqual({ url: "/ads-check/sessions/active", method: "POST" })
        expect(store.adscheck_manager?.session_actived).toBe(true)
        expect(store.adscheck_manager?.session_used).toBe(3)
        expect(store.is_pro_session_active).toBe(true)
        expect(store.use_normal_session).toBe(false)
        expect(localStorage.getItem("setting_use_free")).toBe("0")
    })

    it("returns false when pro activation fails", async () => {
        apiMock.mockResolvedValueOnce({ success: false, message: "limit" })
        const store = useAuthStore()

        const ok = await store.activateProSession()

        expect(ok).toBe(false)
        expect(store.is_pro_session_active).toBe(false)
    })

    it("persists normal session choice with the legacy key", () => {
        const store = useAuthStore()

        store.useNormalSession()

        expect(store.use_normal_session).toBe(true)
        expect(localStorage.getItem("setting_use_free")).toBe("1")
    })
})

describe("logout", () => {
    it("clears auth state and redirects to signin", () => {
        const store = useAuthStore()
        store.user = { id: "u1" } as never
        store.is_authenticated = true
        store.auth_checked = true
        store.last_visit = "ads-check"
        store.adscheck_manager = { session_actived: true }
        store.adscheck_features = [{ code: "feature" }]
        store.adscheck_products = { success: true }

        store.logout()

        expect(store.user).toBeNull()
        expect(store.is_authenticated).toBe(false)
        expect(store.auth_checked).toBe(false)
        expect(store.last_visit).toBeNull()
        expect(store.adscheck_manager).toBeNull()
        expect(store.adscheck_features).toEqual([])
        expect(store.adscheck_products).toBeNull()
        expect(window.location.href).toContain("/signin?referer=")
    })
})
