import type { DatabaseOptions } from "@/core/types/database-options";
import { CreateUserUseCase } from "@/modules/user/application/user/use-cases/create/create-user-use-case";
import type { User } from "@/modules/user/domain/user/entities/user";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { inject, injectable } from "tsyringe";

import { LoginUseCase } from "../login/login-use-case";

export interface RegisterUserUseCaseRequest {
    name: string;
    email: string;
    password: string;
    refreshTtlSeconds: number;
    userAgent?: string;
    ip?: string;
    databaseOptions?: DatabaseOptions;
}

export interface RegisterUserUseCaseResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

/**
 * Cria um novo usuário (sempre com role `USER`) e já dispara o LoginUseCase
 * para devolver os tokens. O frontend recebe o resultado de Register
 * exatamente como receberia um Login bem-sucedido.
 */
@injectable()
export class RegisterUserUseCase {
    constructor(
        @inject(CreateUserUseCase)
        private readonly createUserUseCase: CreateUserUseCase,
        @inject(LoginUseCase)
        private readonly loginUseCase: LoginUseCase
    ) {}

    async execute({
        name,
        email,
        password,
        refreshTtlSeconds,
        userAgent,
        ip,
        databaseOptions,
    }: RegisterUserUseCaseRequest): Promise<RegisterUserUseCaseResponse> {
        await this.createUserUseCase.execute({
            name,
            email,
            password,
            role: UserRole.USER,
            databaseOptions,
        });

        return this.loginUseCase.execute({
            email,
            password,
            refreshTtlSeconds,
            userAgent,
            ip,
            databaseOptions,
        });
    }
}
