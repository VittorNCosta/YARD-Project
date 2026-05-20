import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,
        environment: "node",
        include: ["test/**/*.spec.ts"],
        exclude: [
            "test/**/*.integration.spec.ts",
            "test/**/*.e2e.spec.ts",
            "node_modules",
        ],
        setupFiles: ["./test/helpers/env-setup.ts"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@test": path.resolve(__dirname, "./test"),
        },
    },
});
