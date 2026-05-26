import { env } from "@/config/env";
import type { DatabaseOptions } from "@/core/types/database-options";
import { PasswordResetToken } from "@/modules/auth/domain/auth/entities/password-reset-token";
import { PasswordResetTokenRepository } from "@/modules/auth/domain/auth/repositories/password-reset-token-repository";
import { EmailService } from "@/modules/auth/domain/auth/services/email-service";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { TokenHashService } from "@/modules/auth/domain/auth/services/token-hash-service";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import crypto from "node:crypto";
import { inject, injectable } from "tsyringe";

export interface RequestPasswordResetUseCaseRequest {
    email: string;
    ip?: string;
    userAgent?: string;
    databaseOptions?: DatabaseOptions;
}

const MAX_TOKENS_PER_HOUR = 3;
const ONE_HOUR_MS = 60 * 60 * 1000;
const DUMMY_PLAIN = "dummy-string-for-timing-equalization";

/**
 * Inicia o fluxo "Esqueci minha senha".
 *
 * Anti-enumeração (F-07): SEMPRE retorna void (controller responde 200 com
 * mensagem genérica). Mesmo se o email não existir, é executado um
 * `bcrypt.compare` dummy para equalizar o tempo de resposta com o caminho
 * legítimo (~250ms ambos).
 *
 * Per-email throttle (F-03): se o usuário já criou ≥3 tokens em 1h,
 * retorna void silenciosamente (sem revogar tokens antigos, sem enviar
 * e-mail). Equaliza timing com dummy compare.
 *
 * Token: 32 bytes (256 bits) via `crypto.randomBytes`, codificado em
 * base64url. Persistido como `HMAC-SHA-256(plain, pepper)` (F-05).
 *
 * Falhas de envio de e-mail (F-09): loga apenas `message` + `code`, nunca
 * o objeto completo (pode carregar credenciais SMTP na stack).
 */
@injectable()
export class RequestPasswordResetUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository,
        @inject("PasswordResetTokenRepository")
        private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
        @inject("TokenHashService")
        private readonly tokenHashService: TokenHashService,
        @inject("EmailService")
        private readonly emailService: EmailService,
        @inject("HashService")
        private readonly hashService: HashService
    ) {}

    async execute(
        request: RequestPasswordResetUseCaseRequest
    ): Promise<void> {
        const normalizedEmail = request.email.trim().toLowerCase();

        const user = await this.userRepository.findByEmail(
            normalizedEmail,
            request.databaseOptions
        );

        if (!user || !user.id) {
            // F-07: equaliza timing com o caminho conhecido (bcrypt cost-12).
            await this.hashService.compare(
                DUMMY_PLAIN,
                env.DUMMY_BCRYPT_HASH
            );
            return;
        }

        // F-03: per-email throttle (3/h/usuário).
        const since = new Date(Date.now() - ONE_HOUR_MS);
        const recentCount =
            await this.passwordResetTokenRepository.countUnusedCreatedAfter(
                user.id,
                since,
                request.databaseOptions
            );
        if (recentCount >= MAX_TOKENS_PER_HOUR) {
            await this.hashService.compare(
                DUMMY_PLAIN,
                env.DUMMY_BCRYPT_HASH
            );
            return;
        }

        // Apenas 1 token ativo por usuário.
        await this.passwordResetTokenRepository.revokeAllUnusedForUser(
            user.id,
            request.databaseOptions
        );

        const plainToken = crypto.randomBytes(32).toString("base64url");
        const tokenHash = this.tokenHashService.hash(plainToken);
        const expiresAt = new Date(
            Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000
        );

        const token = PasswordResetToken.create({
            userId: user.id,
            tokenHash,
            expiresAt,
            requestedIp: request.ip ?? null,
        });

        await this.passwordResetTokenRepository.create(
            token,
            request.databaseOptions
        );

        const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${plainToken}`;

        try {
            await this.emailService.sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                resetUrl,
            });
        } catch (err) {
            // F-09: NUNCA logar o objeto completo do nodemailer — pode carregar
            // `transporter.auth` na stack. Apenas message + code.
            const safeMessage =
                err instanceof Error ? err.message : "unknown";
            const safeCode =
                err && typeof err === "object" && "code" in err
                    ? String((err as { code?: unknown }).code ?? "")
                    : "";
            // eslint-disable-next-line no-console -- logger estruturado vem em outro PR
            console.error(
                "[auth.email-send-failed]",
                JSON.stringify({
                    event: "auth.email-send-failed",
                    message: safeMessage,
                    code: safeCode,
                })
            );
            // Não relançamos — anti-enumeração exige resposta 200 idêntica.
        }
    }
}
