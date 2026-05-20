import HttpStatusCode from "@/core/enums/http-status-code";
import { TokenService } from "@/modules/auth/domain/auth/services/token-service";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

/**
 * preHandler que valida o `access_token` (cookie assinado) e popula
 * `request.user`. Em qualquer falha — cookie ausente, assinatura inválida,
 * JWT expirado/malformado — devolve 401 com mensagem genérica.
 */
export async function ensureAuthenticated(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const signed = request.cookies.access_token;
    if (!signed) {
        reply.status(HttpStatusCode.UNAUTHORIZED).send({
            success: false,
            message: "auth.unauthenticated",
        });
        return;
    }

    const unsigned = request.unsignCookie(signed);
    if (!unsigned.valid || !unsigned.value) {
        reply.status(HttpStatusCode.UNAUTHORIZED).send({
            success: false,
            message: "auth.unauthenticated",
        });
        return;
    }

    try {
        const tokenService = container.resolve<TokenService>("TokenService");
        const payload = await tokenService.verifyAccess(unsigned.value);
        request.user = { id: payload.sub, role: payload.role };
    } catch {
        reply.status(HttpStatusCode.UNAUTHORIZED).send({
            success: false,
            message: "auth.unauthenticated",
        });
    }
}
