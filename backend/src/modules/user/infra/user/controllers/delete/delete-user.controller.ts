import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { DeleteUserUseCase } from "@/modules/user/application/user/use-cases/delete/delete-user-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { deleteUserParamsSchema } from "./delete-user.schema";

export class DeleteUserController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            deleteUserParamsSchema,
            request.params
        );

        const useCase = container.resolve(DeleteUserUseCase);
        await useCase.execute({ id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            message: "User deleted successfully",
        });
    }
}
