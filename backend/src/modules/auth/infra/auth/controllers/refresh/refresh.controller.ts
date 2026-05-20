import { env } from "@/config/env";
import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import { RefreshTokenUseCase } from "@/modules/auth/application/auth/use-cases/refresh/refresh-token-use-case";
import {
    accessClearCookieOptions,
    accessCookieOptions,
    refreshClearCookieOptions,
    refreshCookieOptions,
} from "@/modules/auth/infra/auth/utils/cookie-options";
import { parseDurationSeconds } from "@/modules/auth/infra/auth/utils/parse-duration";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

/**
 * POST /api/auth/refresh
 *
 * Lê o cookie `refresh_token` (signed), valida via use case e devolve o
 * novo par. Se algo falhar, limpa ambos os cookies pra forçar logout no
 * cliente.
 */
export class RefreshController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const signedRefresh = request.cookies.refresh_token;
        if (!signedRefresh) {
            reply
                .clearCookie("access_token", accessClearCookieOptions())
                .clearCookie("refresh_token", refreshClearCookieOptions());
            throw new UseCaseError(
                "auth.unauthenticated",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const unsigned = request.unsignCookie(signedRefresh);
        if (!unsigned.valid || !unsigned.value) {
            reply
                .clearCookie("access_token", accessClearCookieOptions())
                .clearCookie("refresh_token", refreshClearCookieOptions());
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const accessTtl = parseDurationSeconds(env.JWT_ACCESS_TTL);
        const refreshTtl = parseDurationSeconds(env.JWT_REFRESH_TTL);

        const useCase = container.resolve(RefreshTokenUseCase);
        const result = await useCase.execute({
            refreshToken: unsigned.value,
            refreshTtlSeconds: refreshTtl,
            userAgent: request.headers["user-agent"],
            ip: request.ip,
        });

        reply
            .setCookie(
                "access_token",
                result.accessToken,
                accessCookieOptions(accessTtl)
            )
            .setCookie(
                "refresh_token",
                result.refreshToken,
                refreshCookieOptions(refreshTtl)
            )
            .status(HttpStatusCode.OK)
            .send({
                success: true,
                message: "Token refreshed successfully",
            });
    }
}
