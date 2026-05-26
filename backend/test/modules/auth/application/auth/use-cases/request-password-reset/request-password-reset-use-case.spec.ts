import { RequestPasswordResetUseCase } from "@/modules/auth/application/auth/use-cases/request-password-reset/request-password-reset-use-case";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeUser } from "@test/modules/user/domain/user/entities/make-user";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";
import { InMemoryPasswordResetTokenRepository } from "@test/modules/auth/infra/auth/repositories/in-memory-password-reset-token-repository";
import { FakeEmailService } from "@test/modules/auth/infra/auth/services/fake-email.service";
import { FakeHashService } from "@test/modules/auth/infra/auth/services/fake-hash.service";
import { FakeTokenHashService } from "@test/modules/auth/infra/auth/services/fake-token-hash.service";

let userRepository: InMemoryUserRepository;
let tokenRepository: InMemoryPasswordResetTokenRepository;
let emailService: FakeEmailService;
let hashService: FakeHashService;
let tokenHashService: FakeTokenHashService;
let sut: RequestPasswordResetUseCase;

describe("RequestPasswordReset use case", () => {
    beforeEach(() => {
        userRepository = new InMemoryUserRepository();
        tokenRepository = new InMemoryPasswordResetTokenRepository();
        emailService = new FakeEmailService();
        hashService = new FakeHashService();
        tokenHashService = new FakeTokenHashService();

        sut = new RequestPasswordResetUseCase(
            userRepository,
            tokenRepository,
            tokenHashService,
            emailService,
            hashService
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("should silently no-op when email does not exist (anti-enumeration)", async () => {
        await sut.execute({ email: "ghost@example.com" });

        expect(emailService.calls).toHaveLength(0);
        expect(tokenRepository.items).toHaveLength(0);
    });

    it("should call hashService.compare in the unknown-user path to equalize timing (F-07)", async () => {
        const spy = vi.spyOn(hashService, "compare");
        await sut.execute({ email: "ghost@example.com" });

        expect(spy).toHaveBeenCalledTimes(1);
        const [plain, hashed] = spy.mock.calls[0] ?? [];
        expect(plain).toBe("dummy-string-for-timing-equalization");
        expect(typeof hashed).toBe("string");
    });

    it("should create one token and send one email for a known user", async () => {
        await userRepository.create(
            await makeUser({
                name: "Alice",
                email: "alice@example.com",
            })
        );

        await sut.execute({ email: "alice@example.com", ip: "1.2.3.4" });

        expect(tokenRepository.items).toHaveLength(1);
        expect(emailService.calls).toHaveLength(1);

        const captured = emailService.calls[0];
        if (!captured) throw new Error("email missing");
        expect(captured.to).toBe("alice@example.com");
        expect(captured.name).toBe("Alice");
        expect(captured.resetUrl).toMatch(
            /^http:\/\/localhost:5173\/reset-password\?token=[A-Za-z0-9_-]+$/
        );
        // tokenHash deve estar persistido (não o plaintext).
        const stored = tokenRepository.items[0];
        if (!stored) throw new Error("token missing");
        expect(stored.tokenHash.startsWith("hashed:")).toBe(true);
        // O plaintext da URL bate com o tokenHash via FakeTokenHashService.
        const url = new URL(captured.resetUrl);
        const plain = url.searchParams.get("token");
        expect(plain).not.toBeNull();
        expect(stored.tokenHash).toBe(`hashed:${plain}`);
        expect(stored.requestedIp).toBe("1.2.3.4");
    });

    it("should normalize email (trim + lowercase) before lookup", async () => {
        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );

        await sut.execute({ email: "  ALICE@example.com  " });

        expect(emailService.calls).toHaveLength(1);
    });

    it("should revoke previous unused token when a new request is made", async () => {
        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );

        await sut.execute({ email: "alice@example.com" });
        await sut.execute({ email: "alice@example.com" });

        expect(tokenRepository.items).toHaveLength(2);
        expect(tokenRepository.items[0]?.isUsed()).toBe(true);
        expect(tokenRepository.items[1]?.isUsed()).toBe(false);
    });

    it("should resolve void when email sending fails (does not leak existence)", async () => {
        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );
        emailService.shouldFail = true;
        // Suprime ruído de console.error no spec.
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(
            sut.execute({ email: "alice@example.com" })
        ).resolves.toBeUndefined();

        // Token foi persistido — falha de email é isolada.
        expect(tokenRepository.items).toHaveLength(1);
        // E-mail registrou tentativa mas falhou.
        expect(emailService.calls).toHaveLength(0);
        expect(errSpy).toHaveBeenCalled();
    });

    it("should silently throttle 4th request within 1 hour (per-email — F-03)", async () => {
        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );

        await sut.execute({ email: "alice@example.com" });
        await sut.execute({ email: "alice@example.com" });
        await sut.execute({ email: "alice@example.com" });
        await sut.execute({ email: "alice@example.com" });

        // Throttle kicks at count >= 3 (the 4th doesn't go through).
        expect(emailService.calls).toHaveLength(3);
    });

    it("should call hashService.compare on throttled path to equalize timing", async () => {
        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );
        // Saturate to throttle: 3 prior requests in the last hour.
        await sut.execute({ email: "alice@example.com" });
        await sut.execute({ email: "alice@example.com" });
        await sut.execute({ email: "alice@example.com" });
        expect(emailService.calls).toHaveLength(3);

        const spy = vi.spyOn(hashService, "compare");
        await sut.execute({ email: "alice@example.com" });

        expect(spy).toHaveBeenCalled();
        // Nada de novo foi gravado nem enviado.
        expect(emailService.calls).toHaveLength(3);
    });

    it("should set expiresAt = now + PASSWORD_RESET_TTL_MINUTES * 60_000", async () => {
        const fixed = new Date("2026-01-01T00:00:00.000Z");
        vi.setSystemTime(fixed);

        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );
        await sut.execute({ email: "alice@example.com" });

        const stored = tokenRepository.items[0];
        if (!stored) throw new Error("token missing");
        const delta = stored.expiresAt.getTime() - fixed.getTime();
        // env de teste define PASSWORD_RESET_TTL_MINUTES=30.
        expect(delta).toBe(30 * 60 * 1000);
    });

    it("should generate a high-entropy URL-safe token in resetUrl", async () => {
        await userRepository.create(
            await makeUser({ email: "alice@example.com" })
        );

        await sut.execute({ email: "alice@example.com" });

        const captured = emailService.calls[0];
        if (!captured) throw new Error("email missing");
        const url = new URL(captured.resetUrl);
        const token = url.searchParams.get("token");
        expect(token).not.toBeNull();
        expect(token!.length).toBeGreaterThanOrEqual(40); // base64url(32 bytes) = 43
        expect(token!).toMatch(/^[A-Za-z0-9_-]+$/); // base64url charset
    });
});
