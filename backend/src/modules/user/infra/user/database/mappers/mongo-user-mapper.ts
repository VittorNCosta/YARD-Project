import { User } from "@/modules/user/domain/user/entities/user";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";

import type { UserDocument } from "../schemas/user.schema";

/**
 * Conversor entre `UserDocument` (Mongo) e `User` (domínio).
 *
 * `passwordHash` pode vir vazio quando o documento é carregado sem
 * `.select("+passwordHash")` — neste caso preservamos string vazia para o
 * domínio. Use cases que precisam comparar senha (LoginUseCase) chamam
 * `findByEmail`, que sempre traz o hash.
 */
export class MongoUserMapper {
    static toDomain(raw: UserDocument): User {
        return User.create({
            id: raw._id?.toString(),
            name: raw.name,
            email: raw.email,
            passwordHash: raw.passwordHash ?? "",
            role: raw.role as UserRole,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    static toPersistency(user: User): Partial<UserDocument> {
        return {
            name: user.name,
            email: user.email,
            passwordHash: user.passwordHash,
            role: user.role,
        };
    }
}
