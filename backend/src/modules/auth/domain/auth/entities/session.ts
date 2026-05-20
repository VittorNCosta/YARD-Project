import type { Optional } from "@/core/types/optional";

/**
 * Sessão de refresh token persistida.
 *
 * - `hashedRefresh`: hash bcrypt do refresh token JWT (jamais o token cru).
 * - `expiresAt`: usado como TTL index no Mongo, garante auto-purge.
 * - `revokedAt`: marca uma session como inválida sem apagar o documento
 *   imediatamente — útil para auditoria/debug. Após `expiresAt` o Mongo
 *   apaga o documento.
 */
export interface SessionProps {
    id?: string;
    userId: string;
    hashedRefresh: string;
    expiresAt: Date;
    revokedAt?: Date | null;
    userAgent?: string | null;
    ip?: string | null;
    createdAt: Date;
}

export class Session {
    id?: string;
    userId: string;
    hashedRefresh: string;
    expiresAt: Date;
    revokedAt?: Date | null;
    userAgent?: string | null;
    ip?: string | null;
    createdAt: Date;

    private constructor(props: SessionProps) {
        this.id = props.id;
        this.userId = props.userId;
        this.hashedRefresh = props.hashedRefresh;
        this.expiresAt = props.expiresAt;
        this.revokedAt = props.revokedAt ?? null;
        this.userAgent = props.userAgent ?? null;
        this.ip = props.ip ?? null;
        this.createdAt = props.createdAt;
    }

    static create(
        props: Optional<
            SessionProps,
            "id" | "revokedAt" | "userAgent" | "ip" | "createdAt"
        >
    ): Session {
        return new Session({
            ...props,
            createdAt: props.createdAt ?? new Date(),
            revokedAt: props.revokedAt ?? null,
            userAgent: props.userAgent ?? null,
            ip: props.ip ?? null,
        });
    }

    revoke(at: Date = new Date()): void {
        this.revokedAt = at;
    }

    isRevoked(): boolean {
        return this.revokedAt !== null && this.revokedAt !== undefined;
    }

    isExpired(now: Date = new Date()): boolean {
        return this.expiresAt.getTime() <= now.getTime();
    }
}
