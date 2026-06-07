import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { RequestPasswordResetUseCase } from "@/modules/auth/application/auth/use-cases/request-password-reset/request-password-reset-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { container } from "tsyringe";

import { forgotPasswordBodySchema } from "./forgot-password.schema";

/**
 * POST /api/auth/forgot-password
 *
 * Sempre responde 200 com mensagem genérica (anti-enumeração — F-07).
 * Erros internos não vazam status diferente: try/catch interno engole
 * exceções e responde 200, salvo se for ZodError de payload inválido
 * (aí 400, porque é defeito do cliente, não da existência do user).
 */
export class ForgotPasswordController {
    async handle(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        let body;
        try {
            body = zodValidationSchema(
                forgotPasswordBodySchema,
                request.body
            );
        } catch (err) {
            // ZodError sobe normalmente — payload inválido é erro do cliente.
            if (err instanceof ZodError) throw err;
            throw err;
        }

        try {
            const useCase = container.resolve(RequestPasswordResetUseCase);
            await useCase.execute({
                email: body.email,
                ip: request.ip,
                userAgent: request.headers["user-agent"],
            });
        } catch (err) {
            // Anti-enumeração: erros internos viram 200 silencioso.
            // eslint-disable-next-line no-console
            console.error(
                "[forgot-password] internal error suppressed",
                err instanceof Error ? err.message : "unknown"
            );
        }

        reply
            .header("Cache-Control", "no-store")
            .header("Referrer-Policy", "no-referrer")
            .status(HttpStatusCode.OK)
            .send({
                success: true,
                message: "auth.password-reset-requested",
            });
    }
}
