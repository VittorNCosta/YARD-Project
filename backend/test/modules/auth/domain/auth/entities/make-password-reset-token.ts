import { PasswordResetToken } from "@/modules/auth/domain/auth/entities/password-reset-token";

interface MakePasswordResetTokenOverrides {
    id?: string;
    userId?: string;
    tokenHash?: string;
    expiresAt?: Date;
    usedAt?: Date | null;
    failedAttempts?: number;
    requestedIp?: string | null;
    createdAt?: Date;
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Factory para testes — espelha o padrão de `make-session.ts`.
 *
 * Defaults sensatos para o caminho feliz:
 * - `userId="user-1"`, `tokenHash="hashed:token.abc"`
 * - `expiresAt = now + 30min`
 * - sem `usedAt`, `failedAttempts=0`, sem `requestedIp`
 */
export function makePasswordResetToken(
    overrides: MakePasswordResetTokenOverrides = {}
): PasswordResetToken {
    return PasswordResetToken.create({
        id: overrides.id,
        userId: overrides.userId ?? "user-1",
        tokenHash: overrides.tokenHash ?? "hashed:token.abc",
        expiresAt:
            overrides.expiresAt ?? new Date(Date.now() + THIRTY_MINUTES_MS),
        usedAt: overrides.usedAt,
        failedAttempts: overrides.failedAttempts,
        requestedIp: overrides.requestedIp,
        createdAt: overrides.createdAt,
    });
}
