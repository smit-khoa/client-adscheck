// @vitest-environment node
// api-client is the shared network boundary (one instance across all remotes via
// MF singleton) — a regression here breaks every app. These tests pin the failure
// classification, the one-shot 401 guard, and signal composition.
//
// node env: AbortSignal.timeout / AbortSignal.any need Node 20+ (engines >=20);
// jsdom doesn't add anything api-client needs.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api, api_get, api_post, resolveApiUrl, setUnauthorizedHandler } from "../api-client"

// A DOMException AbortError is what fetch rejects with on abort/timeout.
const abortError = () => new DOMException("Aborted", "AbortError")

// Minimal Response stand-in (only the fields api-client reads).
function jsonResponse(status: number, body: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: `status ${status}`,
        json: async () => body
    } as unknown as Response
}

// Await a promise expected to reject and return the rejection typed as ApiError
// (every api() rejection is one). Keeps the assertions strict-typecheck clean.
async function rejection(p: Promise<unknown>): Promise<ApiError> {
    return p.catch((e) => e as ApiError)
}

// fetch mock that rejects with AbortError as soon as its signal fires — lets us
// exercise the timeout vs caller-abort branch deterministically.
function abortAwareFetch(): typeof fetch {
    return vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal
            if (signal?.aborted) return reject(abortError())
            signal?.addEventListener("abort", () => reject(abortError()))
        })
    }) as unknown as typeof fetch
}

beforeEach(() => {
    // Clear handler + re-arm the one-shot guard between tests.
    setUnauthorizedHandler(null)
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
})

describe("gateway host resolver", () => {
    it("resolves SMIT team and vn domains by suffix", () => {
        expect(resolveApiUrl("dev.smit.team")).toBe("https://gateway.smit.team")
        expect(resolveApiUrl("adscheck.smit.vn")).toBe("https://gateway.smit.vn")
    })

    it("resolves any host by suffix", () => {
        expect(resolveApiUrl("localhost")).toBe("https://gateway.localhost")
        expect(resolveApiUrl("127.0.0.1")).toBe("https://gateway.0.1")
        expect(resolveApiUrl("::1")).toBe("https://gateway.::1")
    })
})

describe("api success path", () => {
    it("returns parsed JSON on 2xx", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(200, { hello: "world" })) as typeof fetch
        await expect(api({ url: "/x" })).resolves.toEqual({ hello: "world" })
    })

    it("builds the query string from params", async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, {}))
        globalThis.fetch = fetchMock as unknown as typeof fetch
        await api({ url: "/x", params: { a: "1", b: "two" } })
        expect(fetchMock.mock.calls[0]?.[0]).toContain("/x?a=1&b=two")
    })

    it("JSON-encodes the body only when data is present", async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, {}))
        globalThis.fetch = fetchMock as unknown as typeof fetch

        await api({ url: "/x", method: "POST", data: { n: 1 } })
        expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).toBe('{"n":1}')

        fetchMock.mockClear()
        await api({ url: "/x", method: "GET" })
        expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).toBeUndefined()
    })

    it("api_get / api_post are GET/POST shorthands", async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, {}))
        globalThis.fetch = fetchMock as unknown as typeof fetch

        await api_get("/g", { p: "1" })
        expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe("GET")

        await api_post("/p", { d: 2 })
        expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe("POST")
    })
})

describe("error classification", () => {
    it("classifies 401 as auth", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(401, { message: "expired" })) as typeof fetch
        await expect(api({ url: "/x" })).rejects.toMatchObject({ kind: "auth", status: 401 })
    })

    it("classifies other non-2xx as http", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(500, { message: "boom" })) as typeof fetch
        await expect(api({ url: "/x" })).rejects.toMatchObject({ kind: "http", status: 500 })
    })

    it("classifies a fetch reject (network down) as network", async () => {
        globalThis.fetch = vi.fn(async () => {
            throw new TypeError("Failed to fetch")
        }) as typeof fetch
        await expect(api({ url: "/x" })).rejects.toMatchObject({ kind: "network", status: 0 })
    })

    it("uses error_body.message when present, else statusText", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(400, { message: "bad input" })) as typeof fetch
        await expect(api({ url: "/x" })).rejects.toThrow("bad input")

        globalThis.fetch = vi.fn(async () => jsonResponse(403, null)) as typeof fetch
        await expect(api({ url: "/x" })).rejects.toThrow("status 403")
    })
})

describe("timeout vs aborted", () => {
    it("a fired internal timeout signal yields kind 'timeout' (transient)", async () => {
        globalThis.fetch = abortAwareFetch()
        const err = await rejection(api({ url: "/x", timeout_ms: 5 }))
        expect(err).toBeInstanceOf(ApiError)
        expect(err.kind).toBe("timeout")
        expect(err.is_transient).toBe(true)
    })

    it("a caller-aborted signal yields kind 'aborted' (not transient)", async () => {
        globalThis.fetch = abortAwareFetch()
        const controller = new AbortController()
        // Disable the timeout so only the caller signal can fire.
        const p = rejection(api({ url: "/x", timeout_ms: 0, signal: controller.signal }))
        controller.abort()
        const err = await p
        expect(err.kind).toBe("aborted")
        expect(err.is_transient).toBe(false)
    })
})

describe("is_transient getter", () => {
    it("is true for network and timeout, false for http/auth/aborted", () => {
        expect(new ApiError(0, "", null, "network").is_transient).toBe(true)
        expect(new ApiError(0, "", null, "timeout").is_transient).toBe(true)
        expect(new ApiError(500, "", null, "http").is_transient).toBe(false)
        expect(new ApiError(401, "", null, "auth").is_transient).toBe(false)
        expect(new ApiError(0, "", null, "aborted").is_transient).toBe(false)
    })

    it("defaults kind to http for backward compatibility", () => {
        expect(new ApiError(500, "x").kind).toBe("http")
    })
})

describe("401 one-shot guard", () => {
    it("runs the registered handler exactly once for a burst of concurrent 401s", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(401, { message: "expired" })) as typeof fetch
        const handler = vi.fn()
        setUnauthorizedHandler(handler)

        await Promise.allSettled([api({ url: "/a" }), api({ url: "/b" }), api({ url: "/c" })])
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("re-arms when a fresh handler is registered", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(401, { message: "expired" })) as typeof fetch

        const first = vi.fn()
        setUnauthorizedHandler(first)
        await api({ url: "/a" }).catch(() => {})
        expect(first).toHaveBeenCalledTimes(1)

        // Without re-arming, the in-flight flag would stay stuck and swallow this 401.
        const second = vi.fn()
        setUnauthorizedHandler(second)
        await api({ url: "/b" }).catch(() => {})
        expect(second).toHaveBeenCalledTimes(1)
    })

    it("can suppress the registered handler for a scoped 401", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(401, { message: "expired" })) as typeof fetch
        const handler = vi.fn()
        setUnauthorizedHandler(handler)

        await api({ url: "/public/authentication", suppress_unauthorized_handler: true }).catch(() => {})
        expect(handler).not.toHaveBeenCalled()
    })

    it("does not call any handler when none is registered", async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse(401, { message: "expired" })) as typeof fetch
        // No throw beyond the ApiError; absence of a handler must be safe.
        await expect(api({ url: "/a" })).rejects.toMatchObject({ kind: "auth" })
    })
})

describe("composeSignals (via api behavior)", () => {
    it("with no caller signal and timeout disabled, fetch receives no signal", async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, {}))
        globalThis.fetch = fetchMock as unknown as typeof fetch
        await api({ url: "/x", timeout_ms: 0 })
        expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBeUndefined()
    })

    it("with a single caller signal and timeout disabled, that signal is passed through", async () => {
        const fetchMock = vi.fn(async () => jsonResponse(200, {}))
        globalThis.fetch = fetchMock as unknown as typeof fetch
        const controller = new AbortController()
        await api({ url: "/x", timeout_ms: 0, signal: controller.signal })
        expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBe(controller.signal)
    })

    it("with caller signal + timeout, the composed signal fires when the caller aborts", async () => {
        globalThis.fetch = abortAwareFetch()
        const controller = new AbortController()
        const p = rejection(api({ url: "/x", timeout_ms: 10_000, signal: controller.signal }))
        controller.abort()
        const err = await p
        // Composed (AbortSignal.any) → caller fired first, so kind is 'aborted'.
        expect(err.kind).toBe("aborted")
    })
})
