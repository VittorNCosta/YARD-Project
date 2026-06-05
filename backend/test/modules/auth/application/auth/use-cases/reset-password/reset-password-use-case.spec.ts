import { UseCaseError } from "@/core/errors/use-case-error";
import { ResetPasswordUseCase } from "@/modules/auth/application/auth/use-cases/reset-password/reset-password-use-case";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePasswordResetToken } from "@test/modules/auth/domain/auth/entities/make-password-reset-token";
import { InMemoryPasswordResetTokenRepository } from "@test/modules/auth/infra/auth/repositories/in-memory-password-reset-token-repository";
import { InMemorySessionRepository } from "@test/modules/auth/infra/auth/repositories/in-memory-session-repository";
import { FakeHashService } from "@test/modules/auth/infra/auth/services/fake-hash.service";
import { FakeTokenHashService } from "@test/modules/auth/infra/auth/services/fake-token-hash.service";
import { makeUser } from "@test/modules/user/domain/user/entities/make-user";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";

let userRepository: InMemoryUserRepository;
let tokenRepository: InMemoryPasswordResetTokenRepository;
let sessionRepository: InMemorySessionRepository;
let hashService: FakeHashService;
let tokenHashService: FakeTokenHashService;
let sut: ResetPasswordUseCase;

// Token plaintext de tamanho válido (base64url, 43 chars).
const VALID_PLAIN_TOKEN = "abcdef0123456789ABCDEF_-abcdef0123456789ABC";

describe("ResetPassword use case", () => {
    beforeEach(() => {
        userRepository = new InMemoryUserRepository();
        tokenRepository = new InMemoryPasswordResetTokenRepository();
        sessionRepository = new InMemorySessionRepository();
        hashService = new FakeHashService();
        tokenHashService = new FakeTokenHashService();

        sut = new ResetPasswordUseCase(
            userRepository,
            tokenRepository,
            sessionRepository,
            hashService,
            tokenHashService
        );
    });

    it("should throw invalid-credentials error when token is malformed (too short)", async () => {
        await expect(
            sut.execute({ token: "short", newPassword: "NewPass123" })
        ).rejects.toMatchObject({
            key: "auth.password-reset-token-invalid",
            statusCode: 400,
        });
    });

    it("should throw invalid for token with non-base64url chars", async () => {
        const tainted = "!".repeat(43);
        await expect(
            sut.execute({ token: tainted, newPassword: "NewPass123" })
        ).rejects.toMatchObject({
            key: "auth.password-reset-token-invalid",
        });
    });

    it("should throw invalid when token hash is not found", async () => {
        await expect(
            sut.execute({
                token: VALID_PLAIN_TOKEN,
                newPassword: "NewPass123",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should throw token-used when token was already consumed", async () => {
        const user = await userRepository.create(
            await makeUser({ email: "a@b.com" })
        );
        const stored = await tokenRepository.create(
            makePasswordResetToken({
                userId: user.id!,
                tokenHash: `hashed:${VALID_PLAIN_TOKEN}`,
                usedAt: new Date(),
            })
        );
        expect(stored.isUsed()).toBe(true);

        await expect(
            sut.execute({
                token: VALID_PLAIN_TOKEN,
                newPassword: "NewPass123",
            })
        ).rejects.toMatchObject({
            key: "auth.password-reset-token-used",
            statusCode: 410,
        });
    });

    it("should throw token-expired when expiresAt < now", async () => {
        const user = await userRepository.create(
            await makeUser({ email: "a@b.com" })
        );
        await tokenRepository.create(
            makePasswordResetToken({
                userId: user.id!,
                tokenHash: `hashed:${VALID_PLAIN_TOKEN}`,
                expiresAt: new Date(Date.now() - 1000),
            })
        );

        await expect(
            sut.execute({
                token: VALID_PLAIN_TOKEN,
                newPassword: "NewPass123",
            })
        ).rejects.toMatchObject({
            key: "auth.password-reset-token-expired",
            statusCode: 410,
        });
    });

    it("should throw invalid when user no longer exists", async () => {
        await tokenRepository.create(
            makePasswordResetToken({
                userId: "ghost-user-id",
                tokenHash: `hashed:${VALID_PLAIN_TOKEN}`,
            })
        );

        await expect(
            sut.execute({
                token: VALID_PLAIN_TOKEN,
                newPassword: "NewPass123",
            })
        ).rejects.toMatchObject({
            key: "auth.password-reset-token-invalid",
        });
    });

    it("should update password hash and mark token as used on happy path", async () => {
        const user = await userRepository.create(
            await makeUser({ email: "a@b.com", password: "OldPass1" })
        );
        const stored = await tokenRepository.create(
            makePasswordResetToken({
                userId: user.id!,
                tokenHash: `hashed:${VALID_PLAIN_TOKEN}`,
            })
        );

        await sut.execute({
            token: VALID_PLAIN_TOKEN,
            newPassword: "NewPass123",
        });

        const updated = await userRepository.findById(user.id!);
        expect(updated?.passwordHash).toBe("hashed:NewPass123");
        const matches = await hashService.compare(
            "NewPass123",
            updated!.passwordHash
        );
        expect(matches).toBe(true);
        // Token consumido.
        const tokenAfter = await tokenRepository.findById(stored.id!);
        expect(tokenAfter?.isUsed()).toBe(true);
    });

    it("should revoke ALL sessions of user BEFORE updating password (F-04 fail-safe)", async () => {
        const user = await userRepository.create(
            await makeUser({ email: "a@b.com" })
        );
        await tokenRepository.create(
            makePasswordResetToken({
                userId: user.id!,
                tokenHash: `hashed:${VALID_PLAIN_TOKEN}`,
            })
        );

        const revokeSpy = vi.spyOn(sessionRepository, "revokeAllForUser");
        const updateSpy = vi.spyOn(userRepository, "update");

        await sut.execute({
            token: VALID_PLAIN_TOKEN,
            newPassword: "NewPass123",
        });

        expect(revokeSpy).toHaveBeenCalledWith(user.id, undefined);
        // Ordem: revoke chamado ANTES de update.
        expect(revokeSpy.mock.invocationCallOrder[0]).toBeLessThan(
            updateSpy.mock.invocationCallOrder[0] ?? Infinity
        );
    });

    it("should still revoke sessions if password update fails (F-04 fail-safe)", async () => {
        const user = await userRepository.create(
            await makeUser({ email: "a@b.com" })
        );
        await tokenRepository.create(
            makePasswordResetToken({
                userId: user.id!,
                tokenHash: `hashed:${VALID_PLAIN_TOKEN}`,
            })
        );

        const revokeSpy = vi.spyOn(sessionRepository, "revokeAllForUser");
        vi.spyOn(userRepository, "update").mockRejectedValueOnce(
            new Error("db down")
        );

        await expect(
            sut.execute({
                token: VALID_PLAIN_TOKEN,
                newPassword: "NewPass123",
            })
        ).rejects.toThrow("db down");

        // O ponto crítico: sessões já foram revogadas.
        expect(revokeSpy).toHaveBeenCalledWith(user.id, undefined);
    });
});
