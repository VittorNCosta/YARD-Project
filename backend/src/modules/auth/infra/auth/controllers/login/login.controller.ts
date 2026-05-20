import { env } from "@/config/env";
import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { LoginUseCase } from "@/modules/auth/application/auth/use-cases/login/login-use-case";
import {
    accessCookieOptions,
    refreshCookieOptions,
} from "@/modules/auth/infra/auth/utils/cookie-options";
import { parseDurationSeconds } from "@/modules/auth/infra/auth/utils/parse-duration";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { loginBodySchema } from "./login.schema";

export class LoginController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = zodValidationSchema(loginBodySchema, request.body);

        const accessTtl = parseDurationSeconds(env.JWT_ACCESS_TTL);
        const refreshTtl = parseDurationSeconds(env.JWT_REFRESH_TTL);

        const useCase = container.resolve(LoginUseCase);
        const result = await useCase.execute({
            email: body.email,
            password: body.password,
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
                data: { user: UserPresenter.toHTTP(result.user) },
                message: "Logged in successfully",
            });
    }
}
