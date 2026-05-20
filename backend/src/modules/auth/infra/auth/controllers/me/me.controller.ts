import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import { GetAuthenticatedUserUseCase } from "@/modules/auth/application/auth/use-cases/me/get-authenticated-user-use-case";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

/**
 * GET /api/auth/me
 *
 * Devolve o usuário atual derivado do access token. O middleware
 * `ensureAuthenticated` já populou `request.user`.
 */
export class MeController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        if (!request.user) {
            throw new UseCaseError(
                "auth.unauthenticated",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const useCase = container.resolve(GetAuthenticatedUserUseCase);
        const user = await useCase.execute({ userId: request.user.id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: { user: UserPresenter.toHTTP(user) },
        });
    }
}
