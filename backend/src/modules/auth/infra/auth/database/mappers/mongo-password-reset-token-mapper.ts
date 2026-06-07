import { PasswordResetToken } from "@/modules/auth/domain/auth/entities/password-reset-token";

import type { PasswordResetTokenDocument } from "../schemas/password-reset-token.schema";

export class MongoPasswordResetTokenMapper {
    static toDomain(raw: PasswordResetTokenDocument): PasswordResetToken {
        return PasswordResetToken.create({
            id: raw._id?.toString(),
            userId: raw.userId.toString(),
            tokenHash: raw.tokenHash,
            expiresAt: raw.expiresAt,
            usedAt: raw.usedAt ?? null,
            failedAttempts: raw.failedAttempts ?? 0,
            requestedIp: raw.requestedIp ?? null,
            createdAt: raw.createdAt,
        });
    }

    static toPersistency(
        token: PasswordResetToken
    ): Partial<PasswordResetTokenDocument> {
        return {
            userId: token.userId,
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            usedAt: token.usedAt ?? null,
            failedAttempts: token.failedAttempts,
            requestedIp: token.requestedIp ?? null,
        };
    }
}
