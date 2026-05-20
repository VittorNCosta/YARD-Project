import HttpStatusCode from "@/core/enums/http-status-code";
import { LogoutUseCase } from "@/modules/auth/application/auth/use-cases/logout/logout-use-case";
import { TokenService } from "@/modules/auth/domain/auth/services/token-service";
import {
    accessClearCookieOptions,
    refreshClearCookieOptions,
} from "@/modules/auth/infra/auth/utils/cookie-options";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

/**
 * POST /api/auth/logout
 *
 * Revoga a session corrente (lida do refresh cookie) e limpa AMBOS os
 * cookies. Idempotente — mesmo sem cookie válido, a resposta é 200.
 */
export class LogoutController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const signedRefresh = request.cookies.refresh_token;

        if (signedRefresh) {
            const unsigned = request.unsignCookie(signedRefresh);
            if (unsigned.valid && unsigned.value) {
                try {
                    const tokenService = container.resolve<TokenService>(
                        "TokenService"
                    );
                    const payload = await tokenService.verifyRefresh(
                        unsigned.value
                    );
                    const useCase = container.resolve(LogoutUseCase);
                    await useCase.execute({ sessionId: payload.sid });
                } catch {
                    // Token inválido/expirado: ignoramos e seguimos pra limpar cookies.
                }
            }
        }

        reply
            .clearCookie("access_token", accessClearCookieOptions())
            .clearCookie("refresh_token", refreshClearCookieOptions())
            .status(HttpStatusCode.OK)
            .send({
                success: true,
                message: "Logged out successfully",
            });
    }
}
