import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { Session } from "@/modules/auth/domain/auth/entities/session";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { TokenService } from "@/modules/auth/domain/auth/services/token-service";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface RefreshTokenUseCaseRequest {
    refreshToken: string;
    refreshTtlSeconds: number;
    userAgent?: string;
    ip?: string;
    databaseOptions?: DatabaseOptions;
}

export interface RefreshTokenUseCaseResponse {
    accessToken: string;
    refreshToken: string;
}

/**
 * Rotaciona refresh token:
 *   1. Verifica assinatura do refresh JWT.
 *   2. Carrega Session pelo `sid`; rejeita se revogada/expirada.
 *   3. Confere se o `hashedRefresh` bate com o token recebido.
 *   4. Revoga a session antiga.
 *   5. Cria nova Session, assina novo par (access + refresh).
 *
 * Falhas devolvem mensagens genéricas (`auth.session-expired` /
 * `auth.session-revoked` / `auth.invalid-credentials`) — o controller mapeia
 * pra 401 e o cliente força logout.
 */
@injectable()
export class RefreshTokenUseCase {
    constructor(
        @inject("SessionRepository")
        private readonly sessionRepository: SessionRepository,
        @inject("HashService")
        private readonly hashService: HashService,
        @inject("TokenService")
        private readonly tokenService: TokenService,
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute({
        refreshToken,
        refreshTtlSeconds,
        userAgent,
        ip,
        databaseOptions,
    }: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
        let payload: { sub: string; sid: string };
        try {
            payload = await this.tokenService.verifyRefresh(refreshToken);
        } catch {
            throw new UseCaseError(
                "auth.session-expired",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const session = await this.sessionRepository.findById(
            payload.sid,
            databaseOptions
        );
        if (!session) {
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        if (session.isRevoked()) {
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        if (session.isExpired()) {
            throw new UseCaseError(
                "auth.session-expired",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const matches = await this.hashService.compare(
            refreshToken,
            session.hashedRefresh
        );
        if (!matches) {
            // token recebido não confere com o hash gravado — possível replay.
            // Por segurança, revogamos a sessão para invalidar qualquer cópia.
            await this.sessionRepository.revoke(session.id!, databaseOptions);
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        // Recarrega user para pegar role atual (pode ter mudado entre login e refresh).
        const user = await this.userRepository.findById(
            payload.sub,
            databaseOptions
        );
        if (!user || !user.id) {
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        // Revoga a antiga + cria a nova.
        await this.sessionRepository.revoke(session.id!, databaseOptions);

        const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
        const draft = Session.create({
            userId: user.id,
            hashedRefresh: "pending",
            expiresAt,
            userAgent,
            ip,
        });
        const created = await this.sessionRepository.create(
            draft,
            databaseOptions
        );
        if (!created.id) {
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const newRefresh = await this.tokenService.signRefresh({
            sub: user.id,
            sid: created.id,
        });
        created.hashedRefresh = await this.hashService.hash(newRefresh);
        await this.sessionRepository.update(created, databaseOptions);

        const newAccess = await this.tokenService.signAccess({
            sub: user.id,
            role: user.role,
        });

        return { accessToken: newAccess, refreshToken: newRefresh };
    }
}
