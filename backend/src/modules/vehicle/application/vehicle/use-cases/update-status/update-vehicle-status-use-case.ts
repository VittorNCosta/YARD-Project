import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { inject, injectable } from "tsyringe";

export interface UpdateVehicleStatusUseCaseRequest {
    id: string;
    status: string;
    databaseOptions?: DatabaseOptions;
}

export type UpdateVehicleStatusUseCaseResponse = Vehicle;

@injectable()
export class UpdateVehicleStatusUseCase {
    constructor(
        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository
    ) {}

    async execute({
        id,
        status,
        databaseOptions,
    }: UpdateVehicleStatusUseCaseRequest): Promise<UpdateVehicleStatusUseCaseResponse> {
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

        vehicle.changeStatus(status);

        return this.vehicleRepository.update(vehicle, databaseOptions);
    }
}
