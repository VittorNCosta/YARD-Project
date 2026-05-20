import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { UpdateUserRoleUseCase } from "@/modules/user/application/user/use-cases/update-role/update-user-role-use-case";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import {
    updateUserRoleBodySchema,
    updateUserRoleParamsSchema,
} from "./update-user-role.schema";

export class UpdateUserRoleController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            updateUserRoleParamsSchema,
            request.params
        );
        const { role } = zodValidationSchema(
            updateUserRoleBodySchema,
            request.body
        );

        const useCase = container.resolve(UpdateUserRoleUseCase);
        const user = await useCase.execute({ id, role });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: { user: UserPresenter.toHTTP(user) },
            message: "User role updated successfully",
        });
    }
}
