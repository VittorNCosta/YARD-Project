import { buildApp } from "@/infra/http/app";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let app: FastifyInstance;

describe("CORS preflight", () => {
    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it("allows PATCH requests used by yard movement status actions", async () => {
        const res = await app.inject({
            method: "OPTIONS",
            url: "/api/yard-movements/000000000000000000000000/status",
            headers: {
                origin: "http://localhost:5173",
                "access-control-request-method": "PATCH",
                "access-control-request-headers": "content-type",
            },
        });

        expect(res.statusCode).toBe(204);
        expect(res.headers["access-control-allow-origin"]).toBe(
            "http://localhost:5173"
        );
        expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
        expect(res.headers["access-control-allow-headers"]).toContain(
            "content-type"
        );
    });
});
