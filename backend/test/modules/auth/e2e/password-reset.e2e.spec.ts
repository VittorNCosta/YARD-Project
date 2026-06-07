import { PasswordResetTokenModel } from "@/modules/auth/infra/auth/database/schemas/password-reset-token.schema";
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
    cleanMongo,
    startMongo,
    stopMongo,
} from "@test/helpers/mongo-memory";
import { FakeEmailService } from "@test/modules/auth/infra/auth/services/fake-email.service";

let app: FastifyInstance;
let fakeEmail: FakeEmailService;

const REGISTER_BODY = {
    name: "Alice E2E Reset",
    email: "alice.reset@example.com",
    password: "Password1",
} as const;

let ipCounter = 0;
function uniqueIp(): string {
    ipCounter += 1;
    const a = (ipCounter >> 8) & 0xff;
    const b = ipCounter & 0xff;
    return `10.200.${a}.${b}`;
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
        throw new Error(`register failed: ${res.statusCode} ${res.body}`);
    }
}

function extractTokenFromUrl(url: string): string {
    const u = new URL(url);
    const t = u.searchParams.get("token");
    if (!t) throw new Error("no token in reset url");
    return t;
}

describe("Password reset E2E (forgot + reset)", () => {
    beforeAll(async () => {
        await startMongo();
        fakeEmail = new FakeEmailService();
        app = await buildTestApp({ emailService: fakeEmail });
        await PasswordResetTokenModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
        fakeEmail.reset();
    });

    it("forgot-password returns 200 for unknown email and sends NO email (anti-enumeration)", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: "nobody@nowhere.com" },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { success: boolean; message: string };
        expect(body.success).toBe(true);
        expect(body.message).toBe("auth.password-reset-requested");
        expect(fakeEmail.calls).toHaveLength(0);
    });

    it("forgot-password returns 200 for known email and sends exactly one email", async () => {
        await registerUser();

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(200);
        expect(fakeEmail.calls).toHaveLength(1);
        const c = fakeEmail.calls[0]!;
        expect(c.to).toBe(REGISTER_BODY.email);
        expect(c.resetUrl).toMatch(/\/reset-password\?token=[A-Za-z0-9_-]+/);
    });

    it("response bodies for known vs unknown email are identical", async () => {
        await registerUser();
        const known = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email },
            remoteAddress: uniqueIp(),
        });
        const unknown = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: "ghost@nowhere.com" },
            remoteAddress: uniqueIp(),
        });
        expect(known.statusCode).toBe(unknown.statusCode);
        expect(known.body).toBe(unknown.body);
    });

    it("response includes anti-tracking headers (Cache-Control: no-store, Referrer-Policy: no-referrer)", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email },
            remoteAddress: uniqueIp(),
        });
        expect(res.headers["cache-control"]).toBe("no-store");
        expect(res.headers["referrer-policy"]).toBe("no-referrer");
    });

    it("reset-password completes the flow and rejects old password", async () => {
        await registerUser();
        await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email },
            remoteAddress: uniqueIp(),
        });
        const token = extractTokenFromUrl(fakeEmail.calls[0]!.resetUrl);

        const resetRes = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token, password: "NewPass123" },
            remoteAddress: uniqueIp(),
        });
        expect(resetRes.statusCode).toBe(204);

        // Old password rejected
        const oldRes = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: REGISTER_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });
        expect(oldRes.statusCode).toBe(401);

        // New password works
        const newRes = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: "NewPass123",
            },
            remoteAddress: uniqueIp(),
        });
        expect(newRes.statusCode).toBe(200);
    });

    it("reusing the same token returns 410 (token-used)", async () => {
        await registerUser();
        await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email },
            remoteAddress: uniqueIp(),
        });
        const token = extractTokenFromUrl(fakeEmail.calls[0]!.resetUrl);

        const r1 = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token, password: "NewPass123" },
            remoteAddress: uniqueIp(),
        });
        expect(r1.statusCode).toBe(204);

        const r2 = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token, password: "AnotherPass123" },
            remoteAddress: uniqueIp(),
        });
        expect(r2.statusCode).toBe(410);
        expect(r2.json()).toMatchObject({
            success: false,
            message: "auth.password-reset-token-used",
        });
    });

    it("tampered/garbage token returns 400 (token-invalid)", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: {
                token: "X".repeat(43),
                password: "NewPass123",
            },
            remoteAddress: uniqueIp(),
        });
        // Pode ser 400 da Zod ou do use-case — ambos são 400.
        expect(res.statusCode).toBe(400);
    });

    it("malformed token (too short) is rejected by Zod with 400", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token: "ab", password: "NewPass123" },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("weak password is rejected with 400", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token: "a".repeat(43), password: "short" },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("rate-limit kicks in after 3 forgot-password requests from same IP", async () => {
        await registerUser();
        const ip = "10.250.99.99";
        const codes: number[] = [];
        for (let i = 0; i < 4; i++) {
            const res = await app.inject({
                method: "POST",
                url: "/api/auth/forgot-password",
                payload: { email: REGISTER_BODY.email },
                remoteAddress: ip,
            });
            codes.push(res.statusCode);
        }
        // First 3 succeed (200), 4th rate-limited (429).
        expect(codes.slice(0, 3)).toEqual([200, 200, 200]);
        expect(codes[3]).toBe(429);
    });

    it("F-03 per-email throttle: 4th request for same email is silenced (no email)", async () => {
        await registerUser();
        // 4 requests, each from a UNIQUE IP to bypass rate-limit.
        for (let i = 0; i < 4; i++) {
            const res = await app.inject({
                method: "POST",
                url: "/api/auth/forgot-password",
                payload: { email: REGISTER_BODY.email },
                remoteAddress: uniqueIp(),
            });
            expect(res.statusCode).toBe(200);
        }
        // Per-email throttle = MAX 3 emails sent in 1h window.
        expect(fakeEmail.calls.length).toBeLessThanOrEqual(3);
    });

    it("F-01 HTML escape: malicious <script> in user name is escaped in email", async () => {
        const xssName = "<script>alert(1)</script>";
        await registerUser({
            name: xssName,
            email: "xss-victim@example.com",
            password: "Password1",
        });
        await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: "xss-victim@example.com" },
            remoteAddress: uniqueIp(),
        });
        expect(fakeEmail.calls).toHaveLength(1);
        const captured = fakeEmail.calls[0]!;
        // HTML escapado — não aparece literal.
        expect(captured.html).not.toContain("<script>");
        expect(captured.html).toContain("&lt;script&gt;");
        // O `to` carrega o email (não o name), continua intacto.
        expect(captured.to).toBe("xss-victim@example.com");
    });

    it("does not reveal user presence: forgot-password rejects extra fields via .strict()", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email, isAdmin: true },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("expired token returns 410", async () => {
        await registerUser();
        await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: REGISTER_BODY.email },
            remoteAddress: uniqueIp(),
        });
        const token = extractTokenFromUrl(fakeEmail.calls[0]!.resetUrl);

        // Força expiração manipulando o doc direto no Mongo.
        await PasswordResetTokenModel.updateMany(
            {},
            { $set: { expiresAt: new Date(Date.now() - 60_000) } }
        );

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token, password: "NewPass123" },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(410);
        expect(res.json()).toMatchObject({
            success: false,
            message: "auth.password-reset-token-expired",
        });
    });
});
