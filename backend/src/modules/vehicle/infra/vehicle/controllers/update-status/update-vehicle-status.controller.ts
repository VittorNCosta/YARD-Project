import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { UpdateVehicleStatusUseCase } from "@/modules/vehicle/application/vehicle/use-cases/update-status/update-vehicle-status-use-case";
import { VehiclePresenter } from "@/modules/vehicle/infra/vehicle/presenter/vehicle-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import {
    updateVehicleStatusBodySchema,
    updateVehicleStatusParamsSchema,
} from "./update-vehicle-status.schema";

export class UpdateVehicleStatusController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            updateVehicleStatusParamsSchema,
            request.params
        );
        const { status } = zodValidationSchema(
            updateVehicleStatusBodySchema,
            request.body
        );

        const useCase = container.resolve(UpdateVehicleStatusUseCase);
        const vehicle = await useCase.execute({ id, status });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: VehiclePresenter.toHTTP(vehicle),
            message: "Vehicle status updated successfully",
        });
    }
}
