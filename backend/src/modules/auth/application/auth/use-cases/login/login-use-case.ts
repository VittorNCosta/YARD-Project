import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { Session } from "@/modules/auth/domain/auth/entities/session";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { TokenService } from "@/modules/auth/domain/auth/services/token-service";
import type { User } from "@/modules/user/domain/user/entities/user";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface LoginUseCaseRequest {
    email: string;
    password: string;
    refreshTtlSeconds: number;
    userAgent?: string;
    ip?: string;
    databaseOptions?: DatabaseOptions;
}

export interface LoginUseCaseResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

/**
 * Autentica um usuário por email/senha. Em sucesso:
 * - cria uma `Session` (refresh hash bcrypt) no banco;
 * - assina access + refresh JWT;
 * - devolve tudo. O controller é responsável por gravar nos cookies.
 *
 * Em falha (email inexistente OU senha errada) lança a MESMA mensagem
 * genérica `auth.invalid-credentials` — evita user enumeration.
 */
@injectable()
export class LoginUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository,
        @inject("SessionRepository")
        private readonly sessionRepository: SessionRepository,
        @inject("HashService")
        private readonly hashService: HashService,
        @inject("TokenService")
        private readonly tokenService: TokenService
    ) {}

    async execute({
        email,
        password,
        refreshTtlSeconds,
        userAgent,
        ip,
        databaseOptions,
    }: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.userRepository.findByEmail(
            normalizedEmail,
            databaseOptions
        );
        if (!user) {
            throw new UseCaseError(
                "auth.invalid-credentials",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const passwordValid = await this.hashService.compare(
            password,
            user.passwordHash
        );
        if (!passwordValid) {
            throw new UseCaseError(
                "auth.invalid-credentials",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        if (!user.id) {
            // Defensive — repositórios sempre devolvem com id, mas o domínio
            // permite `id?` em outros contextos. Se chegou aqui sem id é bug.
            throw new UseCaseError(
                "auth.invalid-credentials",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

        // Criamos a Session sem hashedRefresh definitivo, persistimos para
        // obter o id, depois assinamos o refresh com o `sid` real e gravamos
        // o hash do token resultante.
        // 1. Persist placeholder session para obter o `sid` real.
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
                "auth.invalid-credentials",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        // 2. Assina o refresh JWT já com o `sid` real.
        const refreshToken = await this.tokenService.signRefresh({
            sub: user.id,
            sid: created.id,
        });

        // 3. Atualiza a Session com o hash do refresh definitivo.
        created.hashedRefresh = await this.hashService.hash(refreshToken);
        await this.sessionRepository.update(created, databaseOptions);

        // 4. Assina o access JWT.
        const accessToken = await this.tokenService.signAccess({
            sub: user.id,
            role: user.role,
        });

        return { accessToken, refreshToken, user };
    }
}
