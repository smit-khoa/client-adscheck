import { defineConfig } from "vitest/config"

// Standalone vitest config — independent of the rspack/MF build.
// jsdom environment so clipboard + localStorage fallbacks are testable.
export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["src/**/*.test.ts"],
        globals: true
    }
})
