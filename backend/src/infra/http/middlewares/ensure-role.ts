import HttpStatusCode from "@/core/enums/http-status-code";
import type { UserRole } from "@/modules/user/domain/user/enums/user-role";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Factory de preHandler que checa se `request.user.role === role`.
 * Deve ser combinado com `ensureAuthenticated` (que popula `request.user`).
 *
 * Exemplo:
 *   onRequest: [app.ensureAuthenticated, app.ensureRole(UserRole.ADMIN)]
 */
export function ensureRole(role: UserRole) {
    return async function ensureRolePrehandler(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        if (!request.user) {
            reply.status(HttpStatusCode.UNAUTHORIZED).send({
                success: false,
                message: "auth.unauthenticated",
            });
            return;
        }

        if (request.user.role !== role) {
            reply.status(HttpStatusCode.FORBIDDEN).send({
                success: false,
                message: "auth.forbidden",
            });
        }
    };
}
