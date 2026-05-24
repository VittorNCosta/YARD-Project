import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { CreateYardMovementUseCase } from "@/modules/yard/application/yard-movement/use-cases/create/create-yard-movement-use-case";
import { YardMovementPresenter } from "@/modules/yard/infra/yard-movement/presenter/yard-movement-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { createYardMovementBodySchema } from "./create-yard-movement.schema";

export class CreateYardMovementController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = zodValidationSchema(
            createYardMovementBodySchema,
            request.body
        );

        const useCase = container.resolve(CreateYardMovementUseCase);
        const yardMovement = await useCase.execute({
            ...body,
            createdBy: request.user?.id,
        });

        reply.status(HttpStatusCode.CREATED).send({
            success: true,
            data: YardMovementPresenter.toHTTP(yardMovement),
            message: "Yard movement created successfully",
        });
    }
}
