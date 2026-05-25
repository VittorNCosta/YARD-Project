import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { CreateDockUseCase } from "@/modules/yard/application/dock/use-cases/create/create-dock-use-case";
import { DockPresenter } from "@/modules/yard/infra/dock/presenter/dock-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { createDockBodySchema } from "./create-dock.schema";

export class CreateDockController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = zodValidationSchema(createDockBodySchema, request.body);

        const useCase = container.resolve(CreateDockUseCase);
        const dock = await useCase.execute(body);

        reply.status(HttpStatusCode.CREATED).send({
            success: true,
            data: DockPresenter.toHTTP(dock),
            message: "Dock created successfully",
        });
    }
}

