import HttpStatusCode from "@/core/enums/http-status-code";
import { ListDockUseCase } from "@/modules/yard/application/dock/use-cases/list/list-dock-use-case";
import { DockPresenter } from "@/modules/yard/infra/dock/presenter/dock-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

export class ListDockController {
    async handle(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const useCase = container.resolve(ListDockUseCase);
        const docks = await useCase.execute();
        const data = docks.map((dock) => DockPresenter.toHTTP(dock));

        reply.status(HttpStatusCode.OK).send({
            success: true,
            count: data.length,
            data,
        });
    }
}

