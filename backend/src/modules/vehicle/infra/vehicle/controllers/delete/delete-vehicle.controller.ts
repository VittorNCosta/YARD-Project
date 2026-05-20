import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { DeleteVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/delete/delete-vehicle-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { deleteVehicleParamsSchema } from "./delete-vehicle.schema";

export class DeleteVehicleController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            deleteVehicleParamsSchema,
            request.params
        );

        const useCase = container.resolve(DeleteVehicleUseCase);
        await useCase.execute({ id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            message: "Vehicle deleted successfully",
        });
    }
}
