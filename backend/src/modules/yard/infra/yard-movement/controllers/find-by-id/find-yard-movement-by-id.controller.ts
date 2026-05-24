import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { FindYardMovementByIdUseCase } from "@/modules/yard/application/yard-movement/use-cases/find/by-id/find-yard-movement-by-id-use-case";
import { YardMovementPresenter } from "@/modules/yard/infra/yard-movement/presenter/yard-movement-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { findYardMovementByIdParamsSchema } from "./find-yard-movement-by-id.schema";
import { loadYardMovementActors } from "../yard-movement-actor-loader";

export class FindYardMovementByIdController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            findYardMovementByIdParamsSchema,
            request.params
        );

        const useCase = container.resolve(FindYardMovementByIdUseCase);
        const yardMovement = await useCase.execute({ id });
        const actors = await loadYardMovementActors([yardMovement]);

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: YardMovementPresenter.toHTTP(yardMovement, actors),
        });
    }
}
