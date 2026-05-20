import { UseCaseError } from "@/core/errors/use-case-error";
import { LoginUseCase } from "@/modules/auth/application/auth/use-cases/login/login-use-case";
import { User } from "@/modules/user/domain/user/entities/user";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InMemorySessionRepository } from "@test/modules/auth/infra/auth/repositories/in-memory-session-repository";
import { FakeHashService } from "@test/modules/auth/infra/auth/services/fake-hash.service";
import { FakeTokenService } from "@test/modules/auth/infra/auth/services/fake-token.service";
import { makeUser } from "@test/modules/user/domain/user/entities/make-user";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";

let userRepository: InMemoryUserRepository;
let sessionRepository: InMemorySessionRepository;
let hashService: FakeHashService;
let tokenService: FakeTokenService;
let sut: LoginUseCase;

describe("Login use case", () => {
    beforeEach(() => {
        userRepository = new InMemoryUserRepository();
        sessionRepository = new InMemorySessionRepository();
        hashService = new FakeHashService();
        tokenService = new FakeTokenService();
        sut = new LoginUseCase(
            userRepository,
            sessionRepository,
            hashService,
            tokenService
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("should be able to login with valid credentials and return tokens + user", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const result = await sut.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        expect(result.accessToken).toMatch(/^access\./);
        expect(result.refreshToken).toMatch(/^refresh\./);
        expect(result.user.email).toBe("alice@example.com");
        expect(sessionRepository.items).toHaveLength(1);

        // hashedRefresh deve bater com o token devolvido.
        const stored = sessionRepository.items[0];
        expect(stored).toBeDefined();
        if (!stored) throw new Error("session missing");
        const matches = await hashService.compare(
            result.refreshToken,
            stored.hashedRefresh
        );
        expect(matches).toBe(true);
    });

    it("should be able to throw UseCaseError when password is wrong", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        await expect(
            sut.execute({
                email: "alice@example.com",
                password: "WrongPass1",
                refreshTtlSeconds: 604_800,
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should be able to throw the same generic error when email does not exist", async () => {
        await expect(
            sut.execute({
                email: "ghost@example.com",
                password: "AnyPass1",
                refreshTtlSeconds: 604_800,
            })
        ).rejects.toMatchObject({
            key: "auth.invalid-credentials",
        });
    });

    it("should be able to normalize email to lowercase before lookup", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const result = await sut.execute({
            email: "  ALICE@EXAMPLE.COM  ",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        expect(result.user.email).toBe("alice@example.com");
    });

    // 5 - hash refresh token before persisting (never store raw)
    it("should hash refresh token before persisting (never store raw)", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const result = await sut.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        expect(sessionRepository.items).toHaveLength(1);
        const stored = sessionRepository.items[0];
        if (!stored) throw new Error("session missing");
        // O hash difere do token cru, e segue o padrão "hashed:" do FakeHash.
        expect(stored.hashedRefresh).not.toBe(result.refreshToken);
        expect(stored.hashedRefresh.startsWith("hashed:")).toBe(true);
    });

    // 6 - distinct sessions on concurrent logins
    it("should create distinct sessions on concurrent logins", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const [a, b] = await Promise.all([
            sut.execute({
                email: "alice@example.com",
                password: "Password1",
                refreshTtlSeconds: 604_800,
            }),
            sut.execute({
                email: "alice@example.com",
                password: "Password1",
                refreshTtlSeconds: 604_800,
            }),
        ]);

        expect(sessionRepository.items).toHaveLength(2);
        const [s1, s2] = sessionRepository.items;
        if (!s1 || !s2) throw new Error("sessions missing");

        expect(s1.id).toBeDefined();
        expect(s2.id).toBeDefined();
        expect(s1.id).not.toBe(s2.id);
        expect(s1.hashedRefresh).not.toBe(s2.hashedRefresh);
        // E os tokens devolvidos também são distintos (sids diferentes).
        expect(a.refreshToken).not.toBe(b.refreshToken);
    });

    // 7 - propagate userAgent and ip into session
    it("should propagate userAgent and ip into session", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        await sut.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
            userAgent: "Mozilla/5.0 (Test Browser)",
            ip: "203.0.113.42",
        });

        const stored = sessionRepository.items[0];
        if (!stored) throw new Error("session missing");
        expect(stored.userAgent).toBe("Mozilla/5.0 (Test Browser)");
        expect(stored.ip).toBe("203.0.113.42");
    });

    // 8 - expiresAt = now + refreshTtlSeconds
    it("should set expiresAt = now + refreshTtlSeconds", async () => {
        const fixed = new Date("2026-01-01T00:00:00.000Z");
        vi.setSystemTime(fixed);

        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const ttlSec = 3600; // 1h
        await sut.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: ttlSec,
        });

        const stored = sessionRepository.items[0];
        if (!stored) throw new Error("session missing");
        const delta = stored.expiresAt.getTime() - fixed.getTime();
        expect(delta).toBe(ttlSec * 1000);
    });

    // 9 - throws invalid-credentials when user has no id (defensive)
    it("should throw invalid-credentials when user has no id (defensive)", async () => {
        // Repositório que devolve um user sem id.
        const ghostRepo = new InMemoryUserRepository();
        const original = ghostRepo.findByEmail.bind(ghostRepo);
        // sobrescreve findByEmail para retornar um User sem id, mas com hash que bate
        ghostRepo.findByEmail = async () => {
            const u = User.create({
                name: "Ghost",
                email: "ghost@example.com",
                passwordHash: await hashService.hash("Password1"),
                role: UserRole.USER,
            });
            // Garantir que o id é undefined (User.create não atribui id).
            u.id = undefined;
            return u;
        };
        // mantém referência só pra evitar warning de não usar
        void original;

        const localSut = new LoginUseCase(
            ghostRepo,
            sessionRepository,
            hashService,
            tokenService
        );

        await expect(
            localSut.execute({
                email: "ghost@example.com",
                password: "Password1",
                refreshTtlSeconds: 604_800,
            })
        ).rejects.toMatchObject({
            key: "auth.invalid-credentials",
            statusCode: 401,
        });
    });

    // 10 - sign access token with role from user
    it("should sign access token with role from user", async () => {
        await userRepository.create(
            await makeUser({
                email: "admin@example.com",
                password: "Password1",
                role: UserRole.ADMIN,
            })
        );

        const spy = vi.spyOn(tokenService, "signAccess");

        await sut.execute({
            email: "admin@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        expect(spy).toHaveBeenCalledTimes(1);
        const call = spy.mock.calls[0];
        if (!call) throw new Error("signAccess was not called");
        const [payload] = call;
        expect(payload).toMatchObject({
            sub: expect.any(String),
            role: UserRole.ADMIN,
        });
    });

    // 11 - not leak passwordHash in returned user reference (just type-check + sanity)
    it("should return a User domain entity (presenter is the controller's job)", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const result = await sut.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        expect(result.user).toBeInstanceOf(User);
        // Sanity: o use case devolve a entidade pura — quem decide ocultar
        // o passwordHash é o controller via UserPresenter.toHTTP().
        expect(typeof result.user.passwordHash).toBe("string");
        expect(result.user.passwordHash.length).toBeGreaterThan(0);
    });
});
