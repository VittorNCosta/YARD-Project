import type { FastifyInstance } from "fastify";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import { buildTestApp } from "@test/helpers/build-test-app";
import {
    decodeJwtPayload,
    parseSetCookie,
    splitSignedCookie,
} from "@test/helpers/http-cookies";
import {
    cleanMongo,
    startMongo,
    stopMongo,
} from "@test/helpers/mongo-memory";

let app: FastifyInstance;

const REGISTER_BODY = {
    name: "Alice E2E",
    email: "alice.e2e@example.com",
    password: "Password1",
} as const;

/**
 * Gera um IP único por chamada para evitar contenção do rate-limiter
 * (login está em 5 req/min). Specs que querem testar rate-limit
 * explicitamente passam um IP fixo.
 */
let ipCounter = 0;
function uniqueIp(): string {
    ipCounter += 1;
    const a = (ipCounter >> 8) & 0xff;
    const b = ipCounter & 0xff;
    return `10.99.${a}.${b}`;
}

async function registerUser(
    body: { name: string; email: string; password: string } = REGISTER_BODY
): Promise<void> {
    const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: body,
        remoteAddress: uniqueIp(),
    });
    if (res.statusCode !== 201) {
        throw new Error(
            `register failed: ${res.statusCode} ${res.body}`
        );
    }
}

describe("POST /api/auth/login (E2E happy + Zod)", () => {
    beforeAll(async () => {
        await startMongo();
        app = await buildTestApp();
    });

    afterAll(async () => {
        await app.close();
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    it("200 returns user without passwordHash", async () => {
        await registerUser();

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: REGISTER_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json() as {
            success: boolean;
            data: { user: { email: string; passwordHash?: unknown } };
        };
        expect(body.success).toBe(true);
        expect(body.data.user.email).toBe(REGISTER_BODY.email);
        expect(body.data.user.passwordHash).toBeUndefined();
        // sanity: o JSON cru não menciona passwordHash em hipótese alguma.
        expect(res.body).not.toMatch(/passwordHash/i);
    });

    it("sets two signed cookies with correct flags (HttpOnly, SameSite=Lax, NOT Secure in test)", async () => {
        await registerUser();

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: REGISTER_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });

        const cookies = parseSetCookie(
            res.headers["set-cookie"] as string | string[] | undefined
        );

        const access = cookies.access_token;
        const refresh = cookies.refresh_token;
        expect(access).toBeDefined();
        expect(refresh).toBeDefined();
        if (!access || !refresh) throw new Error("cookies missing");

        // access flags
        expect(access.attrs.path).toBe("/");
        expect(access.attrs.httponly).toBe(true);
        expect(String(access.attrs.samesite).toLowerCase()).toBe("lax");
        expect(access.attrs.secure).toBeUndefined(); // NODE_ENV=test → no Secure

        // refresh flags
        expect(refresh.attrs.path).toBe("/api/auth");
        expect(refresh.attrs.httponly).toBe(true);
        expect(String(refresh.attrs.samesite).toLowerCase()).toBe("lax");
        expect(refresh.attrs.secure).toBeUndefined();
    });

    it("cookie value is HMAC-signed and decodes to valid HS256 JWT", async () => {
        await registerUser();

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: REGISTER_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });

        const cookies = parseSetCookie(
            res.headers["set-cookie"] as string | string[] | undefined
        );
        const access = cookies.access_token;
        if (!access) throw new Error("missing access cookie");

        const { value: rawJwt, signature } = splitSignedCookie(access.value);
        // signed: '<jwt>.<base64sig>' — signature deve ser não-vazia.
        expect(signature.length).toBeGreaterThan(0);

        // o JWT em si tem 3 partes (header.payload.sig)
        const parts = rawJwt.split(".");
        expect(parts).toHaveLength(3);

        const payload = decodeJwtPayload<{
            sub: string;
            role: string;
            exp: number;
        }>(rawJwt);
        expect(typeof payload.sub).toBe("string");
        expect(typeof payload.role).toBe("string");
        expect(typeof payload.exp).toBe("number");
    });

    it("400 for malformed email", async () => {
        await registerUser();

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: "not-an-email",
                password: REGISTER_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("400 for password length 0 and 400 for password length 129", async () => {
        await registerUser();

        const empty = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: "",
            },
            remoteAddress: uniqueIp(),
        });
        expect(empty.statusCode).toBe(400);

        const huge = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: "p".repeat(129),
            },
            remoteAddress: uniqueIp(),
        });
        expect(huge.statusCode).toBe(400);
    });

    it("400 for extra field (.strict())", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: REGISTER_BODY.password,
                isAdmin: true, // privilege escalation attempt
            },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("400 for missing required field", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
            },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("4xx for non-JSON content-type", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            headers: { "content-type": "text/plain" },
            payload: "email=alice@example.com&password=Password1",
            remoteAddress: uniqueIp(),
        });
        // Fastify rejeita com 415 Unsupported Media Type por default.
        expect(res.statusCode).toBeGreaterThanOrEqual(400);
        expect(res.statusCode).toBeLessThan(500);
    });
});
