import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { DeleteDockUseCase } from "@/modules/yard/application/dock/use-cases/delete/delete-dock-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { deleteDockParamsSchema } from "./delete-dock.schema";

export class DeleteDockController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            deleteDockParamsSchema,
            request.params
        );

        const useCase = container.resolve(DeleteDockUseCase);
        await useCase.execute({ id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            message: "Dock deleted successfully",
        });
    }
}

