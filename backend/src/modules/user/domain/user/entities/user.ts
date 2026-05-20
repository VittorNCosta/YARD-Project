import type { Optional } from "@/core/types/optional";

import { UserRole } from "../enums/user-role";

/**
 * Contrato de propriedades do User.
 *
 * `passwordHash` faz parte da entidade porque é necessário para comparar
 * credenciais em LoginUseCase. Mas qualquer camada que devolva dados ao
 * mundo externo (HTTP, logs, fila) DEVE passar por `UserPresenter.toHTTP()`
 * que omite o hash. Nunca serializar o objeto User direto.
 */
export interface UserProps {
    id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Entidade User.
 *
 * Padrão DDD: constructor privado, `User.create()` aplica defaults.
 * Domínio puro — sem dependência de Mongoose/Fastify.
 */
export class User {
    id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;

    private constructor(props: UserProps) {
        this.id = props.id;
        this.name = props.name;
        this.email = props.email;
        this.passwordHash = props.passwordHash;
        this.role = props.role;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    static create(
        props: Optional<
            UserProps,
            "id" | "role" | "createdAt" | "updatedAt"
        >
    ): User {
        const now = new Date();
        return new User({
            ...props,
            role: props.role ?? UserRole.USER,
            createdAt: props.createdAt ?? now,
            updatedAt: props.updatedAt ?? now,
        });
    }

    changeRole(role: UserRole): void {
        this.role = role;
        this.updatedAt = new Date();
    }

    changePasswordHash(passwordHash: string): void {
        this.passwordHash = passwordHash;
        this.updatedAt = new Date();
    }
}
