import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { TokenService } from "@/modules/auth/domain/auth/services/token-service";
import { MongoSessionRepository } from "@/modules/auth/infra/auth/database/repositories/mongo-session-repository";
import { BcryptHashService } from "@/modules/auth/infra/auth/services/bcrypt-hash.service";
import { JwtTokenService } from "@/modules/auth/infra/auth/services/jwt-token.service";
import { container } from "tsyringe";

/**
 * Bindings tsyringe do módulo Auth.
 * Carregado via `infra/providers/index.ts`.
 */
container.registerSingleton<SessionRepository>(
    "SessionRepository",
    MongoSessionRepository
);
container.registerSingleton<HashService>("HashService", BcryptHashService);
container.registerSingleton<TokenService>("TokenService", JwtTokenService);
