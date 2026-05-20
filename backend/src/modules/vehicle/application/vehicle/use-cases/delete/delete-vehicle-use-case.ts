import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { inject, injectable } from "tsyringe";

export interface DeleteVehicleUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

export type DeleteVehicleUseCaseResponse = void;

@injectable()
export class DeleteVehicleUseCase {
    constructor(
        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: DeleteVehicleUseCaseRequest): Promise<DeleteVehicleUseCaseResponse> {
        const vehicle = await this.vehicleRepository.findById(
            id,
            databaseOptions
        );

        if (!vehicle) {
            throw new UseCaseError(
                "vehicle.not-found",
                HttpStatusCode.NOT_FOUND
            );
        }

        await this.vehicleRepository.delete(id, databaseOptions);
    }
}
