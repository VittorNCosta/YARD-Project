import { Session } from "@/modules/auth/domain/auth/entities/session";

interface MakeSessionOverrides {
    id?: string;
    userId?: string;
    hashedRefresh?: string;
    expiresAt?: Date;
    revokedAt?: Date | null;
    userAgent?: string | null;
    ip?: string | null;
    createdAt?: Date;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Factory para testes — espelha o padrão de `make-user.ts`.
 *
 * Defaults sensatos para o caminho feliz:
 * - `userId="user-1"`, `hashedRefresh="hashed:refresh.xxx"`
 * - `expiresAt = now + 7d`
 * - sem revogação, sem userAgent, sem ip
 */
export function makeSession(overrides: MakeSessionOverrides = {}): Session {
    return Session.create({
        id: overrides.id,
        userId: overrides.userId ?? "user-1",
        hashedRefresh: overrides.hashedRefresh ?? "hashed:refresh.xxx",
        expiresAt:
            overrides.expiresAt ?? new Date(Date.now() + SEVEN_DAYS_MS),
        revokedAt: overrides.revokedAt,
        userAgent: overrides.userAgent,
        ip: overrides.ip,
        createdAt: overrides.createdAt,
    });
}
