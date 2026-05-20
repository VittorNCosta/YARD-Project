import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import { User } from "@/modules/user/domain/user/entities/user";
import type { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface CreateUserUseCaseRequest {
    name: User["name"];
    email: User["email"];
    password: string;
    role?: UserRole;
    databaseOptions?: DatabaseOptions;
}

export type CreateUserUseCaseResponse = User;

@injectable()
export class CreateUserUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository,
        @inject("HashService")
        private readonly hashService: HashService
    ) {}

    async execute({
        name,
        email,
        password,
        role,
        databaseOptions,
    }: CreateUserUseCaseRequest): Promise<CreateUserUseCaseResponse> {
        const normalizedEmail = email.trim().toLowerCase();

        const existing = await this.userRepository.findByEmail(
            normalizedEmail,
            databaseOptions
        );
        if (existing) {
            throw new UseCaseError(
                "user.email-already-exists",
                HttpStatusCode.CONFLICT
            );
        }

        const passwordHash = await this.hashService.hash(password);

        const user = User.create({
            name,
            email: normalizedEmail,
            passwordHash,
            role,
        });

        return this.userRepository.create(user, databaseOptions);
    }
}
