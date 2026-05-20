import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { User } from "@/modules/user/domain/user/entities/user";
import type { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface UpdateUserRoleUseCaseRequest {
    id: string;
    role: UserRole;
    databaseOptions?: DatabaseOptions;
}

export type UpdateUserRoleUseCaseResponse = User;

@injectable()
export class UpdateUserRoleUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute({
        id,
        role,
        databaseOptions,
    }: UpdateUserRoleUseCaseRequest): Promise<UpdateUserRoleUseCaseResponse> {
        const user = await this.userRepository.findById(id, databaseOptions);
        if (!user) {
            throw new UseCaseError("user.not-found", HttpStatusCode.NOT_FOUND);
        }

        user.changeRole(role);

        return this.userRepository.update(user, databaseOptions);
    }
}
