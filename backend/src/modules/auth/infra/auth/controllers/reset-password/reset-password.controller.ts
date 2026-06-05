import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { ResetPasswordUseCase } from "@/modules/auth/application/auth/use-cases/reset-password/reset-password-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { resetPasswordBodySchema } from "./reset-password.schema";

/**
 * POST /api/auth/reset-password
 *
 * Em sucesso: 204 (sem body — frontend exibe toast e redireciona para login).
 * Em falha: UseCaseError sobe via error-handler global (400/410).
 */
export class ResetPasswordController {
    async handle(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const body = zodValidationSchema(
            resetPasswordBodySchema,
            request.body
        );

        const useCase = container.resolve(ResetPasswordUseCase);
        await useCase.execute({
            token: body.token,
            newPassword: body.password,
        });

        reply
            .header("Cache-Control", "no-store")
            .header("Referrer-Policy", "no-referrer")
            .status(HttpStatusCode.NO_CONTENT)
            .send();
    }
}
