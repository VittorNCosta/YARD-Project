import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { CreateUserUseCase } from "@/modules/user/application/user/use-cases/create/create-user-use-case";
import { UserPresenter } from "@/modules/user/infra/user/presenter/user-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { createUserBodySchema } from "./create-user.schema";

export class CreateUserController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = zodValidationSchema(createUserBodySchema, request.body);

        const useCase = container.resolve(CreateUserUseCase);
        const user = await useCase.execute(body);

        reply.status(HttpStatusCode.CREATED).send({
            success: true,
            data: { user: UserPresenter.toHTTP(user) },
            message: "User created successfully",
        });
    }
}
