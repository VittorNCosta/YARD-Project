import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { FindVehicleByIdUseCase } from "@/modules/vehicle/application/vehicle/use-cases/find/by-id/find-vehicle-by-id-use-case";
import { VehiclePresenter } from "@/modules/vehicle/infra/vehicle/presenter/vehicle-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { findVehicleByIdParamsSchema } from "./find-vehicle-by-id.schema";

export class FindVehicleByIdController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { id } = zodValidationSchema(
            findVehicleByIdParamsSchema,
            request.params
        );

        const useCase = container.resolve(FindVehicleByIdUseCase);
        const vehicle = await useCase.execute({ id });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: VehiclePresenter.toHTTP(vehicle),
        });
    }
}
