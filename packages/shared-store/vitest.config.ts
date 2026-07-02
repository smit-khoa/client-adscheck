import { defineConfig } from "vitest/config"

// Standalone vitest config — independent of the rspack/MF build.
// jsdom environment because auth-store touches localStorage + window.location.
export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["src/**/*.test.ts"],
        globals: true,
        passWithNoTests: true
    }
})
