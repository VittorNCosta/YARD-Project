import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface DeleteUserUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

export type DeleteUserUseCaseResponse = void;

@injectable()
export class DeleteUserUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: DeleteUserUseCaseRequest): Promise<DeleteUserUseCaseResponse> {
        const user = await this.userRepository.findById(id, databaseOptions);
        if (!user) {
            throw new UseCaseError("user.not-found", HttpStatusCode.NOT_FOUND);
        }

        await this.userRepository.delete(id, databaseOptions);
    }
}
