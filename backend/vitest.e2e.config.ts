import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,
        environment: "node",
        include: ["test/**/*.e2e.spec.ts"],
        setupFiles: ["./test/helpers/env-setup-integration.ts"],
        testTimeout: 30_000,
        hookTimeout: 120_000,
        // E2E compartilha estado de mongoose + tsyringe + memory-server.
        // Rodar serial é a única forma estável.
        fileParallelism: false,
        sequence: { concurrent: false },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@test": path.resolve(__dirname, "./test"),
        },
    },
});
