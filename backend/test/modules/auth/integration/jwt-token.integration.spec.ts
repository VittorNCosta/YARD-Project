import { JwtTokenService } from "@/modules/auth/infra/auth/services/jwt-token.service";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import jwt from "jsonwebtoken";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let sut: JwtTokenService;

const REFRESH_SECRET = "y".repeat(32);

describe("JwtTokenService (integration)", () => {
    beforeAll(() => {
        sut = new JwtTokenService();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("signAccess + verifyAccess round-trip preserves payload", async () => {
        const token = await sut.signAccess({
            sub: "user-1",
            role: UserRole.ADMIN,
        });
        const payload = await sut.verifyAccess(token);
        expect(payload).toEqual({
            sub: "user-1",
            role: UserRole.ADMIN,
        });
    });

    it("verifyAccess rejects token signed with refresh secret", async () => {
        // Forjamos um JWT cujo payload se parece com access, mas é assinado
        // com o REFRESH_SECRET. `verifyAccess` deve falhar a verificação
        // de assinatura.
        const malicious = jwt.sign(
            { sub: "user-1", role: UserRole.ADMIN },
            REFRESH_SECRET,
            { algorithm: "HS256", expiresIn: "15m" }
        );

        await expect(sut.verifyAccess(malicious)).rejects.toThrow();
    });

    it("verifyAccess rejects alg=none token (unsigned)", async () => {
        // Constrói manualmente um JWT com alg=none (sem signature segment)
        const header = Buffer.from(
            JSON.stringify({ alg: "none", typ: "JWT" })
        ).toString("base64url");
        const payload = Buffer.from(
            JSON.stringify({
                sub: "user-1",
                role: UserRole.ADMIN,
                exp: Math.floor(Date.now() / 1000) + 60,
            })
        ).toString("base64url");
        const noneToken = `${header}.${payload}.`;

        await expect(sut.verifyAccess(noneToken)).rejects.toThrow();
    });

    it("verifyAccess rejects token with tampered payload", async () => {
        const token = await sut.signAccess({
            sub: "user-1",
            role: UserRole.USER,
        });
        const parts = token.split(".");
        if (parts.length !== 3) throw new Error("malformed token in test");
        const [h, , s] = parts;

        // Forjamos um payload com role=ADMIN, mas mantemos a signature
        // original (que cobre o payload antigo). Assinatura deve falhar.
        const tampered = Buffer.from(
            JSON.stringify({
                sub: "user-1",
                role: UserRole.ADMIN,
                exp: Math.floor(Date.now() / 1000) + 60,
            })
        ).toString("base64url");

        const tamperedToken = `${h}.${tampered}.${s}`;
        await expect(sut.verifyAccess(tamperedToken)).rejects.toThrow();
    });

    it("signRefresh embeds sub and sid", async () => {
        const token = await sut.signRefresh({
            sub: "user-99",
            sid: "session-abc",
        });
        const decoded = jwt.verify(token, REFRESH_SECRET, {
            algorithms: ["HS256"],
        }) as { sub: string; sid: string };
        expect(decoded.sub).toBe("user-99");
        expect(decoded.sid).toBe("session-abc");
    });

    it("verifyAccess throws for expired token", async () => {
        // Assinamos com tempo X, depois avançamos o relógio para X + 1h.
        const start = new Date("2026-01-01T00:00:00.000Z");
        vi.setSystemTime(start);

        const token = await sut.signAccess({
            sub: "user-1",
            role: UserRole.USER,
        });

        // TTL do env-setup-integration é 15m. Avançamos 1h para garantir
        // expiração e dar margem de clock skew default do jsonwebtoken.
        const future = new Date(start.getTime() + 60 * 60 * 1000);
        vi.setSystemTime(future);

        await expect(sut.verifyAccess(token)).rejects.toThrow();
    });
});
