import type { DatabaseOptions } from "@/core/types/database-options";

import type { User } from "../entities/user";

export interface ListUserOptions {
    page?: number;
    perPage?: number;
    q?: string;
}

export interface CountUserOptions {
    q?: string;
}

/**
 * Contrato de persistência da entidade User.
 *
 * `findByEmail` é o único método que pode trazer o `passwordHash` carregado
 * (Mongoose `.select("+passwordHash")`) — é o caminho usado pelo LoginUseCase.
 * Todos os outros métodos podem omitir o hash.
 */
export abstract class UserRepository {
    abstract create(
        user: User,
        databaseOptions?: DatabaseOptions
    ): Promise<User>;

    abstract findById(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<User | null>;

    abstract findByEmail(
        email: string,
        databaseOptions?: DatabaseOptions
    ): Promise<User | null>;

    abstract findMany(
        options: ListUserOptions,
        databaseOptions?: DatabaseOptions
    ): Promise<User[]>;

    abstract count(
        options: CountUserOptions,
        databaseOptions?: DatabaseOptions
    ): Promise<number>;

    abstract update(
        user: User,
        databaseOptions?: DatabaseOptions
    ): Promise<User>;

    abstract delete(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;
}
