import { LoginUseCase } from "@/modules/auth/application/auth/use-cases/login/login-use-case";
import { LogoutUseCase } from "@/modules/auth/application/auth/use-cases/logout/logout-use-case";
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
let sut: LogoutUseCase;

describe("Logout use case", () => {
    beforeEach(() => {
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
        sut = new LogoutUseCase(sessionRepository);
    });

    it("should be able to revoke the given session", async () => {
        await userRepository.create(
            await makeUser({
                email: "alice@example.com",
                password: "Password1",
            })
        );

        await loginUseCase.execute({
            email: "alice@example.com",
            password: "Password1",
            refreshTtlSeconds: 604_800,
        });

        const session = sessionRepository.items[0];
        expect(session).toBeDefined();
        if (!session) throw new Error("missing session");

        expect(session.isRevoked()).toBe(false);

        await sut.execute({ sessionId: session.id! });

        const after = await sessionRepository.findById(session.id!);
        expect(after?.isRevoked()).toBe(true);
    });

    it("should be able to be idempotent for an unknown session", async () => {
        await expect(
            sut.execute({ sessionId: "non-existent" })
        ).resolves.toBeUndefined();
    });
});
