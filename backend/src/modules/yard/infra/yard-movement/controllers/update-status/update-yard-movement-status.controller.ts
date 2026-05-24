import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { UpdateYardMovementStatusUseCase } from "@/modules/yard/application/yard-movement/use-cases/update-status/update-yard-movement-status-use-case";
import { YardMovementPresenter } from "@/modules/yard/infra/yard-movement/presenter/yard-movement-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import {
    updateYardMovementStatusBodySchema,
    updateYardMovementStatusParamsSchema,
} from "./update-yard-movement-status.schema";

export class UpdateYardMovementStatusController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            updateYardMovementStatusParamsSchema,
            request.params
        );
        const body = zodValidationSchema(
            updateYardMovementStatusBodySchema,
            request.body
        );

        const useCase = container.resolve(UpdateYardMovementStatusUseCase);
        const yardMovement = await useCase.execute({
            id,
            ...body,
            actorId: request.user?.id,
        });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: YardMovementPresenter.toHTTP(yardMovement),
            message: "Yard movement status updated successfully",
        });
    }
}
