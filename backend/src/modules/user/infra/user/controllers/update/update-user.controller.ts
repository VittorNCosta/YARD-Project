import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { UpdateUserUseCase } from "@/modules/user/application/user/use-cases/update/update-user-use-case";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import {
    updateUserBodySchema,
    updateUserParamsSchema,
} from "./update-user.schema";

export class UpdateUserController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            updateUserParamsSchema,
            request.params
        );
        const body = zodValidationSchema(updateUserBodySchema, request.body);

        const useCase = container.resolve(UpdateUserUseCase);
        const user = await useCase.execute({ id, ...body });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: { user: UserPresenter.toHTTP(user) },
            message: "User updated successfully",
        });
    }
}
