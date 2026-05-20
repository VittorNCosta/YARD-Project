import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { FindUserByIdUseCase } from "@/modules/user/application/user/use-cases/find/by-id/find-user-by-id-use-case";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { findUserByIdParamsSchema } from "./find-user-by-id.schema";

/**
 * GET /api/users/:id
 *
 * Permissão: o próprio user OU admin. Outros papéis recebem 403.
 * O middleware de autenticação já garante que `request.user` está populado
 * — checamos a regra de owner-or-admin aqui no controller, conforme o plano.
 */
export class FindUserByIdController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            findUserByIdParamsSchema,
            request.params
        );

        const requester = request.user;
        if (!requester) {
            throw new UseCaseError(
                "auth.unauthenticated",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const isAdmin = requester.role === UserRole.ADMIN;
        const isOwner = requester.id === id;
        if (!isAdmin && !isOwner) {
            throw new UseCaseError(
                "user.forbidden",
                HttpStatusCode.FORBIDDEN
            );
        }

        const useCase = container.resolve(FindUserByIdUseCase);
        const user = await useCase.execute({ id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: { user: UserPresenter.toHTTP(user) },
        });
    }
}
