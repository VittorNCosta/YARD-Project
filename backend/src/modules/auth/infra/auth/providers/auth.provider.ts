import { PasswordResetTokenRepository } from "@/modules/auth/domain/auth/repositories/password-reset-token-repository";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { EmailService } from "@/modules/auth/domain/auth/services/email-service";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { TokenHashService } from "@/modules/auth/domain/auth/services/token-hash-service";
import { TokenService } from "@/modules/auth/domain/auth/services/token-service";
import { MongoPasswordResetTokenRepository } from "@/modules/auth/infra/auth/database/repositories/mongo-password-reset-token-repository";
import { MongoSessionRepository } from "@/modules/auth/infra/auth/database/repositories/mongo-session-repository";
import { BcryptHashService } from "@/modules/auth/infra/auth/services/bcrypt-hash.service";
import { JwtTokenService } from "@/modules/auth/infra/auth/services/jwt-token.service";
import { NodemailerEmailService } from "@/modules/auth/infra/auth/services/nodemailer-email.service";
import { Sha256TokenHashService } from "@/modules/auth/infra/auth/services/sha256-token-hash.service";
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

// Password reset
container.registerSingleton<PasswordResetTokenRepository>(
    "PasswordResetTokenRepository",
    MongoPasswordResetTokenRepository
);
container.registerSingleton<TokenHashService>(
    "TokenHashService",
    Sha256TokenHashService
);
container.registerSingleton<EmailService>(
    "EmailService",
    NodemailerEmailService
);
