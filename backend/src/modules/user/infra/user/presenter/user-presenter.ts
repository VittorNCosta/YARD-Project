import type { User } from "@/modules/user/domain/user/entities/user";

/**
 * Presenter de User.
 *
 * REGRA INVIOLÁVEL: jamais retornar `passwordHash` em resposta HTTP, log,
 * fila ou qualquer canal externo. Toda serialização de User para fora do
 * backend DEVE passar por este método.
 */
export class UserPresenter {
    static toHTTP(user: User): {
        id: string | undefined;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    } {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
