import type { Optional } from "@/core/types/optional";

/**
 * Token de redefinição de senha persistido.
 *
 * - `tokenHash`: HMAC-SHA-256(plainToken, RESET_TOKEN_PEPPER). NUNCA o token cru.
 *   Bcrypt foi descartado (F-05): token aleatório de 256 bits não se beneficia
 *   de KDF lento, e bcrypt no path de reset vira DoS amplifier.
 * - `expiresAt`: TTL index no Mongo auto-purga; `isExpired()` defende o gap
 *   de ~60s entre expiry e purge.
 * - `usedAt`: marca consumo para impedir replay (idempotência + auditoria).
 * - `failedAttempts`: defense-in-depth — ≥5 força `markUsed` (hoje impossível
 *   com lookup-by-hash, fica protegido para refactors futuros).
 * - `requestedIp`: forense only, nunca exposto no response.
 */
export interface PasswordResetTokenProps {
    id?: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt?: Date | null;
    failedAttempts: number;
    requestedIp?: string | null;
    createdAt: Date;
}

export class PasswordResetToken {
    id?: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt?: Date | null;
    failedAttempts: number;
    requestedIp?: string | null;
    createdAt: Date;

    private constructor(props: PasswordResetTokenProps) {
        this.id = props.id;
        this.userId = props.userId;
        this.tokenHash = props.tokenHash;
        this.expiresAt = props.expiresAt;
        this.usedAt = props.usedAt ?? null;
        this.failedAttempts = props.failedAttempts;
        this.requestedIp = props.requestedIp ?? null;
        this.createdAt = props.createdAt;
    }

    static create(
        props: Optional<
            PasswordResetTokenProps,
            "id" | "usedAt" | "failedAttempts" | "requestedIp" | "createdAt"
        >
    ): PasswordResetToken {
        return new PasswordResetToken({
            ...props,
            usedAt: props.usedAt ?? null,
            failedAttempts: props.failedAttempts ?? 0,
            requestedIp: props.requestedIp ?? null,
            createdAt: props.createdAt ?? new Date(),
        });
    }

    markUsed(at: Date = new Date()): void {
        this.usedAt = at;
    }

    incrementFailedAttempts(): void {
        this.failedAttempts += 1;
    }

    isUsed(): boolean {
        return this.usedAt !== null && this.usedAt !== undefined;
    }

    isExpired(now: Date = new Date()): boolean {
        return this.expiresAt.getTime() <= now.getTime();
    }

    /**
     * Pronto para consumo: não usado e não expirado.
     */
    isConsumable(now: Date = new Date()): boolean {
        return !this.isUsed() && !this.isExpired(now);
    }
}
