import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { CreateVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/create/create-vehicle-use-case";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { VehiclePresenter } from "@/modules/vehicle/infra/vehicle/presenter/vehicle-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { createVehicleBodySchema } from "./create-vehicle.schema";

export class CreateVehicleController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = zodValidationSchema(
            createVehicleBodySchema,
            request.body
        );

        const useCase = container.resolve(CreateVehicleUseCase);

        const vehicle = await useCase.execute({
            plate: body.plate,
            driverName: body.driverName,
            cargoType: body.cargoType,
            status: body.status,
            color: body.color,
            driverCpf: body.driverCpf,
            vehicleType: body.vehicleType,
            weighingRequired: body.weighingRequired,
            activeStatus: body.activeStatus as VehicleActiveStatus | undefined,
            entryDate: body.entryDate,
            arrivalDate: body.arrivalDate,
            departureDate: body.departureDate,
            releasedBy: body.releasedBy,
            processType: body.processType,
            entryWeight: body.entryWeight,
            exitWeight: body.exitWeight,
            dock: body.dock,
        });

        reply.status(HttpStatusCode.CREATED).send({
            success: true,
            data: VehiclePresenter.toHTTP(vehicle),
            message: "Vehicle created successfully",
        });
    }
}
