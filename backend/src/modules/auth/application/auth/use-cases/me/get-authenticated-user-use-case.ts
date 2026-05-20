import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { User } from "@/modules/user/domain/user/entities/user";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface GetAuthenticatedUserUseCaseRequest {
    userId: string;
    databaseOptions?: DatabaseOptions;
}

export type GetAuthenticatedUserUseCaseResponse = User;

@injectable()
export class GetAuthenticatedUserUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute({
        userId,
        databaseOptions,
    }: GetAuthenticatedUserUseCaseRequest): Promise<GetAuthenticatedUserUseCaseResponse> {
        const user = await this.userRepository.findById(
            userId,
            databaseOptions
        );
        if (!user) {
            throw new UseCaseError(
                "auth.unauthenticated",
                HttpStatusCode.UNAUTHORIZED
            );
        }
        return user;
    }
}
