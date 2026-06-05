import type { DatabaseOptions } from "@/core/types/database-options";
import type { PasswordResetToken } from "@/modules/auth/domain/auth/entities/password-reset-token";
import { PasswordResetTokenRepository } from "@/modules/auth/domain/auth/repositories/password-reset-token-repository";

export class InMemoryPasswordResetTokenRepository extends PasswordResetTokenRepository {
    public items: PasswordResetToken[] = [];
    private nextId = 1;

    async create(
        token: PasswordResetToken,
        _options?: DatabaseOptions
    ): Promise<PasswordResetToken> {
        if (!token.id) {
            token.id = String(this.nextId++);
        }
        this.items.push(token);
        return token;
    }

    async findById(
        id: string,
        _options?: DatabaseOptions
    ): Promise<PasswordResetToken | null> {
        return this.items.find((t) => t.id === id) ?? null;
    }

    async findByTokenHash(
        tokenHash: string,
        _options?: DatabaseOptions
    ): Promise<PasswordResetToken | null> {
        return this.items.find((t) => t.tokenHash === tokenHash) ?? null;
    }

    async markUsed(id: string, _options?: DatabaseOptions): Promise<void> {
        const token = this.items.find((t) => t.id === id);
        if (token) token.markUsed();
    }

    async incrementFailedAttempts(
        id: string,
        _options?: DatabaseOptions
    ): Promise<void> {
        const token = this.items.find((t) => t.id === id);
        if (token) token.incrementFailedAttempts();
    }

    async revokeAllUnusedForUser(
        userId: string,
        _options?: DatabaseOptions
    ): Promise<void> {
        for (const token of this.items) {
            if (token.userId === userId && !token.isUsed()) {
                token.markUsed();
            }
        }
    }

    async countUnusedCreatedAfter(
        userId: string,
        since: Date,
        _options?: DatabaseOptions
    ): Promise<number> {
        // Espelha o repo Mongo: conta TODOS os tokens (used ou não) do usuário
        // criados após `since`. O nome legado "unused" é mantido por contrato
        // — o que importa para o throttle (F-03) é a frequência de pedidos.
        return this.items.filter(
            (t) => t.userId === userId && t.createdAt >= since
        ).length;
    }
}
