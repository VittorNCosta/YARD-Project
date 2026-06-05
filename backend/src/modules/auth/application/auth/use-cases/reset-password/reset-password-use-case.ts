import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { PasswordResetTokenRepository } from "@/modules/auth/domain/auth/repositories/password-reset-token-repository";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { TokenHashService } from "@/modules/auth/domain/auth/services/token-hash-service";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface ResetPasswordUseCaseRequest {
    token: string;
    newPassword: string;
    databaseOptions?: DatabaseOptions;
}

// base64url de 32 bytes = 43 chars sem padding. Aceitamos uma janela [40..256]
// para acomodar pequenas variações futuras e ataques de payload-bloating
// já barrados (256 é o cap do Zod do controller).
const TOKEN_MIN_LENGTH = 40;
const TOKEN_MAX_LENGTH = 256;
const TOKEN_REGEX = /^[A-Za-z0-9_-]+$/; // base64url charset

/**
 * Conclui o fluxo "Esqueci minha senha".
 *
 * Ordem CRÍTICA de mutação (F-04 — fail-safe):
 *   1. Revoga TODAS as sessões do user PRIMEIRO.
 *   2. Atualiza o passwordHash.
 *   3. Marca o token como usado.
 *
 * Se um passo entre 1 e 2 falhar, o estado seguro é "todas sessões
 * revogadas, senha intacta" — recuperável via novo reset. NUNCA "senha
 * nova + sessões antigas vivas".
 */
@injectable()
export class ResetPasswordUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository,
        @inject("PasswordResetTokenRepository")
        private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
        @inject("SessionRepository")
        private readonly sessionRepository: SessionRepository,
        @inject("HashService")
        private readonly hashService: HashService,
        @inject("TokenHashService")
        private readonly tokenHashService: TokenHashService
    ) {}

    async execute(request: ResetPasswordUseCaseRequest): Promise<void> {
        // 1. Validar formato do token (defesa em profundidade — controller já
        //    valida via Zod, mas o use-case não deve confiar.)
        if (
            !request.token ||
            request.token.length < TOKEN_MIN_LENGTH ||
            request.token.length > TOKEN_MAX_LENGTH ||
            !TOKEN_REGEX.test(request.token)
        ) {
            throw new UseCaseError(
                "auth.password-reset-token-invalid",
                HttpStatusCode.BAD_REQUEST
            );
        }

        // 2. Lookup por hash (F-06 — sem ObjectId no URL).
        const tokenHash = this.tokenHashService.hash(request.token);
        const stored = await this.passwordResetTokenRepository.findByTokenHash(
            tokenHash,
            request.databaseOptions
        );

        if (!stored || !stored.id) {
            throw new UseCaseError(
                "auth.password-reset-token-invalid",
                HttpStatusCode.BAD_REQUEST
            );
        }

        if (stored.isUsed()) {
            throw new UseCaseError(
                "auth.password-reset-token-used",
                HttpStatusCode.GONE
            );
        }

        if (stored.isExpired()) {
            throw new UseCaseError(
                "auth.password-reset-token-expired",
                HttpStatusCode.GONE
            );
        }

        const user = await this.userRepository.findById(
            stored.userId,
            request.databaseOptions
        );

        if (!user || !user.id) {
            // Não vaza "usuário deletado" — mensagem genérica.
            throw new UseCaseError(
                "auth.password-reset-token-invalid",
                HttpStatusCode.BAD_REQUEST
            );
        }

        // 3. F-04 — fail-safe ordering: REVOGAR SESSÕES PRIMEIRO.
        await this.sessionRepository.revokeAllForUser(
            user.id,
            request.databaseOptions
        );

        // 4. Atualiza hash da senha.
        const newPasswordHash = await this.hashService.hash(
            request.newPassword
        );
        user.changePasswordHash(newPasswordHash);
        await this.userRepository.update(user, request.databaseOptions);

        // 5. Marca o token como usado (no-replay).
        await this.passwordResetTokenRepository.markUsed(
            stored.id,
            request.databaseOptions
        );
        stored.markUsed();
    }
}
