import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { ListUserUseCase } from "@/modules/user/application/user/use-cases/list/list-user-use-case";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { listUserQuerySchema } from "./list-user.schema";

export class ListUserController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { page, perPage, q } = zodValidationSchema(
            listUserQuerySchema,
            request.query
        );

        const useCase = container.resolve(ListUserUseCase);
        const result = await useCase.execute({ page, perPage, q });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: {
                items: result.items.map((u) => UserPresenter.toHTTP(u)),
                total: result.total,
                page: result.page,
                perPage: result.perPage,
            },
        });
    }
}
