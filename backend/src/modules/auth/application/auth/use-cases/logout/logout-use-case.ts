import type { DatabaseOptions } from "@/core/types/database-options";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { inject, injectable } from "tsyringe";

export interface LogoutUseCaseRequest {
    sessionId: string;
    databaseOptions?: DatabaseOptions;
}

export type LogoutUseCaseResponse = void;

/**
 * Revoga a session corrente. O controller é responsável por limpar os
 * cookies. Idempotente — se a session já não existe, não há erro.
 */
@injectable()
export class LogoutUseCase {
    constructor(
        @inject("SessionRepository")
        private readonly sessionRepository: SessionRepository
    ) {}

    async execute({
        sessionId,
        databaseOptions,
    }: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
        await this.sessionRepository.revoke(sessionId, databaseOptions);
    }
}
