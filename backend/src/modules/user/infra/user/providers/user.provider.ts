import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { MongoUserRepository } from "@/modules/user/infra/user/database/repositories/mongo-user-repository";
import { container } from "tsyringe";

/**
 * Bindings tsyringe do módulo User.
 * Carregado via `infra/providers/index.ts`.
 */
container.registerSingleton<UserRepository>(
    "UserRepository",
    MongoUserRepository
);
