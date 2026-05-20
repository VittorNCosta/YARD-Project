import { env } from "@/config/env";
import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { RegisterUserUseCase } from "@/modules/auth/application/auth/use-cases/register/register-user-use-case";
import {
    accessCookieOptions,
    refreshCookieOptions,
} from "@/modules/auth/infra/auth/utils/cookie-options";
import { parseDurationSeconds } from "@/modules/auth/infra/auth/utils/parse-duration";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { registerBodySchema } from "./register.schema";

export class RegisterController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = zodValidationSchema(registerBodySchema, request.body);

        const accessTtl = parseDurationSeconds(env.JWT_ACCESS_TTL);
        const refreshTtl = parseDurationSeconds(env.JWT_REFRESH_TTL);

        const useCase = container.resolve(RegisterUserUseCase);
        const result = await useCase.execute({
            name: body.name,
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
            .status(HttpStatusCode.CREATED)
            .send({
                success: true,
                data: { user: UserPresenter.toHTTP(result.user) },
                message: "User registered successfully",
            });
    }
}
