import type { UserRole } from "@/modules/user/domain/user/enums/user-role";
import type { preHandlerHookHandler } from "fastify";

/**
 * Augmentations dos tipos do Fastify para os decorators e propriedades
 * customizadas registradas em `infra/http/middlewares/auth-decorators.ts`.
 */
declare module "fastify" {
    interface FastifyInstance {
        ensureAuthenticated: preHandlerHookHandler;
        ensureRole: (role: UserRole) => preHandlerHookHandler;
    }

    interface FastifyRequest {
        user?: {
            id: string;
            role: UserRole;
        };
    }
}
