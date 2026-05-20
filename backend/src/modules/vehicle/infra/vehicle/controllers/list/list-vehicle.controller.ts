import HttpStatusCode from "@/core/enums/http-status-code";
import { ListVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/list/list-vehicle-use-case";
import { VehiclePresenter } from "@/modules/vehicle/infra/vehicle/presenter/vehicle-presenter";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

export class ListVehicleController {
    async handle(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const useCase = container.resolve(ListVehicleUseCase);
        const vehicles = await useCase.execute();

        const data = vehicles.map((v) => VehiclePresenter.toHTTP(v));

        reply.status(HttpStatusCode.OK).send({
            success: true,
            count: data.length,
            data,
        });
    }
}
