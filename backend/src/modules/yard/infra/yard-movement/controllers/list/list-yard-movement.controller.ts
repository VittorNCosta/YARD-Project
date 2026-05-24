import HttpStatusCode from "@/core/enums/http-status-code";
import { ListYardMovementUseCase } from "@/modules/yard/application/yard-movement/use-cases/list/list-yard-movement-use-case";
import { YardMovementPresenter } from "@/modules/yard/infra/yard-movement/presenter/yard-movement-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

export class ListYardMovementController {
    async handle(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const useCase = container.resolve(ListYardMovementUseCase);
        const yardMovements = await useCase.execute();

        const data = yardMovements.map((yardMovement) =>
            YardMovementPresenter.toHTTP(yardMovement)
        );

        reply.status(HttpStatusCode.OK).send({
            success: true,
            count: data.length,
            data,
        });
    }
}
