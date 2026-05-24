import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { UpdateDockUseCase } from "@/modules/yard/application/dock/use-cases/update/update-dock-use-case";
import { DockPresenter } from "@/modules/yard/infra/dock/presenter/dock-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { updateDockBodySchema, updateDockParamsSchema } from "./update-dock.schema";

export class UpdateDockController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(updateDockParamsSchema, request.params);
        const body = zodValidationSchema(updateDockBodySchema, request.body);

        const useCase = container.resolve(UpdateDockUseCase);
        const dock = await useCase.execute({ id, ...body });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: DockPresenter.toHTTP(dock),
            message: "Dock updated successfully",
        });
    }
}

