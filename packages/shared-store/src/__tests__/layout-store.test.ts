// layout-store is a thin shared singleton (title / header slot / sidebar). Tests
// pin its three setters so a signature change surfaces as a red test.

import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { defineComponent } from "vue"
import { useLayoutStore } from "../layout-store"

beforeEach(() => {
    setActivePinia(createPinia())
})

describe("layout-store setters", () => {
    it("setTitle updates the title (and accepts null)", () => {
        const store = useLayoutStore()
        store.setTitle("Dashboard")
        expect(store.title).toBe("Dashboard")
        store.setTitle(null)
        expect(store.title).toBeNull()
    })

    it("setHeaderSlot stores the component", () => {
        const store = useLayoutStore()
        const slot = defineComponent({ render: () => null })
        store.setHeaderSlot(slot)
        expect(store.headerSlot).toBe(slot)
        store.setHeaderSlot(null)
        expect(store.headerSlot).toBeNull()
    })

    it("setSidebarOpen toggles the flag", () => {
        const store = useLayoutStore()
        expect(store.isSidebarOpen).toBe(false)
        store.setSidebarOpen(true)
        expect(store.isSidebarOpen).toBe(true)
    })
})
