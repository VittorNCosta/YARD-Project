import type { DatabaseOptions } from "@/core/types/database-options";

import type { PasswordResetToken } from "../entities/password-reset-token";

/**
 * Contrato de persistência dos tokens de redefinição de senha.
 *
 * - Sem `deleteExpired`: o TTL index do Mongo (`expireAfterSeconds: 0`) cuida
 *   da purga automática. `isExpired()` defende o gap entre expiry e purge.
 * - `findByTokenHash` é O(1) via índice único — não passar pelo formato
 *   `{ObjectId}.{plain}` (F-06: vazaria timestamp do token via ObjectId).
 * - `countUnusedCreatedAfter` alimenta o per-email throttle (F-03).
 */
export abstract class PasswordResetTokenRepository {
    abstract create(
        token: PasswordResetToken,
        databaseOptions?: DatabaseOptions
    ): Promise<PasswordResetToken>;

    abstract findById(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<PasswordResetToken | null>;

    abstract findByTokenHash(
        tokenHash: string,
        databaseOptions?: DatabaseOptions
    ): Promise<PasswordResetToken | null>;

    abstract markUsed(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;

    abstract incrementFailedAttempts(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;

    abstract revokeAllUnusedForUser(
        userId: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;

    abstract countUnusedCreatedAfter(
        userId: string,
        since: Date,
        databaseOptions?: DatabaseOptions
    ): Promise<number>;
}
