import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { FindDockByIdUseCase } from "@/modules/yard/application/dock/use-cases/find/by-id/find-dock-by-id-use-case";
import { DockPresenter } from "@/modules/yard/infra/dock/presenter/dock-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { findDockByIdParamsSchema } from "./find-dock-by-id.schema";

export class FindDockByIdController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            findDockByIdParamsSchema,
            request.params
        );

        const useCase = container.resolve(FindDockByIdUseCase);
        const dock = await useCase.execute({ id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: DockPresenter.toHTTP(dock),
        });
    }
}

