import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { User } from "@/modules/user/domain/user/entities/user";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface FindUserByIdUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

export type FindUserByIdUseCaseResponse = User;

@injectable()
export class FindUserByIdUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: FindUserByIdUseCaseRequest): Promise<FindUserByIdUseCaseResponse> {
        const user = await this.userRepository.findById(id, databaseOptions);

        if (!user) {
            throw new UseCaseError("user.not-found", HttpStatusCode.NOT_FOUND);
        }

        return user;
    }
}
