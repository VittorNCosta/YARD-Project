import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { UpdateVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/update/update-vehicle-use-case";
import type { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { VehiclePresenter } from "@/modules/vehicle/infra/vehicle/presenter/vehicle-presenter";

import {
    updateVehicleBodySchema,
    updateVehicleParamsSchema,
} from "./update-vehicle.schema";

export class UpdateVehicleController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            updateVehicleParamsSchema,
            request.params
        );
        const body = zodValidationSchema(
            updateVehicleBodySchema,
            request.body
        );

        const useCase = container.resolve(UpdateVehicleUseCase);

        const vehicle = await useCase.execute({
            id,
            ...body,
            activeStatus: body.activeStatus as VehicleActiveStatus | undefined,
        });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: VehiclePresenter.toHTTP(vehicle),
            message: "Vehicle updated successfully",
        });
    }
}
