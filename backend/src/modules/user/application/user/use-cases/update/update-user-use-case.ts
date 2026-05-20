import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import type { User } from "@/modules/user/domain/user/entities/user";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface UpdateUserUseCaseRequest {
    id: string;
    name?: User["name"];
    email?: User["email"];
    password?: string;
    databaseOptions?: DatabaseOptions;
}

export type UpdateUserUseCaseResponse = User;

/**
 * Atualização parcial de um User (sem mudança de role — usar
 * UpdateUserRoleUseCase). Se `password` vier preenchido, é re-hashado.
 * Se `email` mudar, valida unicidade.
 */
@injectable()
export class UpdateUserUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository,
        @inject("HashService")
        private readonly hashService: HashService
    ) {}

    async execute({
        id,
        name,
        email,
        password,
        databaseOptions,
    }: UpdateUserUseCaseRequest): Promise<UpdateUserUseCaseResponse> {
        const user = await this.userRepository.findById(id, databaseOptions);
        if (!user) {
            throw new UseCaseError("user.not-found", HttpStatusCode.NOT_FOUND);
        }

        if (email !== undefined) {
            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== user.email) {
                const existing = await this.userRepository.findByEmail(
                    normalizedEmail,
                    databaseOptions
                );
                if (existing && existing.id !== user.id) {
                    throw new UseCaseError(
                        "user.email-already-exists",
                        HttpStatusCode.CONFLICT
                    );
                }
                user.email = normalizedEmail;
            }
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (password !== undefined) {
            const passwordHash = await this.hashService.hash(password);
            user.changePasswordHash(passwordHash);
        }

        user.updatedAt = new Date();

        return this.userRepository.update(user, databaseOptions);
    }
}
