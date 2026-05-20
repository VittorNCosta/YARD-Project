import { UseCaseError } from "@/core/errors/use-case-error";
import { LoginUseCase } from "@/modules/auth/application/auth/use-cases/login/login-use-case";
import { RefreshTokenUseCase } from "@/modules/auth/application/auth/use-cases/refresh/refresh-token-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemorySessionRepository } from "@test/modules/auth/infra/auth/repositories/in-memory-session-repository";
import { FakeHashService } from "@test/modules/auth/infra/auth/services/fake-hash.service";
import { FakeTokenService } from "@test/modules/auth/infra/auth/services/fake-token.service";
import { makeUser } from "@test/modules/user/domain/user/entities/make-user";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";

let userRepository: InMemoryUserRepository;
let sessionRepository: InMemorySessionRepository;
let hashService: FakeHashService;
let tokenService: FakeTokenService;
let loginUseCase: LoginUseCase;
let sut: RefreshTokenUseCase;

describe("Refresh token use case", () => {
    beforeEach(async () => {
        userRepository = new InMemoryUserRepository();
        sessionRepository = new InMemorySessionRepository();
        hashService = new FakeHashService();
        tokenService = new FakeTokenService();
        loginUseCase = new LoginUseCase(
            userRepository,
            sessionRepository,
            hashService,
            tokenService
        );
        sut = new RefreshTokenUseCase(
            sessionRepository,
            hashService,
            tokenService,
            userRepository
        );
    });

    it("should be able to rotate the refresh token and revoke the old session", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const login = await loginUseCase.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        const oldSessionsCount = sessionRepository.items.length;
        const oldSession = sessionRepository.items[oldSessionsCount - 1];
        expect(oldSession).toBeDefined();
        if (!oldSession) throw new Error("missing session");

        const result = await sut.execute({
            refreshToken: login.refreshToken,
            refreshTtlSeconds: 604_800,
        });

        expect(result.accessToken).toMatch(/^access\./);
        expect(result.refreshToken).toMatch(/^refresh\./);
        expect(result.refreshToken).not.toBe(login.refreshToken);

        // Sessão antiga ficou revogada.
        const oldAfter = await sessionRepository.findById(oldSession.id!);
        expect(oldAfter?.isRevoked()).toBe(true);

        // Nova sessão existe e não está revogada.
        expect(sessionRepository.items.length).toBe(oldSessionsCount + 1);
        const newest = sessionRepository.items[sessionRepository.items.length - 1];
        expect(newest?.isRevoked()).toBe(false);
    });

    it("should be able to throw when refresh is reused after revocation", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        const login = await loginUseCase.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        await sut.execute({
            refreshToken: login.refreshToken,
            refreshTtlSeconds: 604_800,
        });

        // Reusing the original refresh token must throw.
        await expect(
            sut.execute({
                refreshToken: login.refreshToken,
                refreshTtlSeconds: 604_800,
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should be able to throw when refresh token is malformed", async () => {
        await expect(
            sut.execute({
                refreshToken: "not-a-real-token",
                refreshTtlSeconds: 604_800,
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });
});
