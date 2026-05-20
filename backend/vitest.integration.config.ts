import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,
        environment: "node",
        include: ["test/**/*.integration.spec.ts"],
        setupFiles: ["./test/helpers/env-setup-integration.ts"],
        testTimeout: 30_000,
        hookTimeout: 120_000, // primeiro download do binário Mongo no Windows
        // Mongoose + memory-server em paralelo cria contenção sobre a
        // conexão global; rodamos serial para evitar flakiness.
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
