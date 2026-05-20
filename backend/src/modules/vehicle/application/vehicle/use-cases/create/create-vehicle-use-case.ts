import type { DatabaseOptions } from "@/core/types/database-options";
import { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import type { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { inject, injectable } from "tsyringe";

export interface CreateVehicleUseCaseRequest {
    plate: Vehicle["plate"];
    driverName: Vehicle["driverName"];
    cargoType: Vehicle["cargoType"];
    status: Vehicle["status"];
    color?: Vehicle["color"];
    driverCpf?: Vehicle["driverCpf"];
    vehicleType?: Vehicle["vehicleType"];
    weighingRequired?: Vehicle["weighingRequired"];
    activeStatus?: VehicleActiveStatus;
    entryDate?: Vehicle["entryDate"];
    arrivalDate?: Vehicle["arrivalDate"];
    departureDate?: Vehicle["departureDate"];
    releasedBy?: Vehicle["releasedBy"];
    processType?: Vehicle["processType"];
    entryWeight?: Vehicle["entryWeight"];
    exitWeight?: Vehicle["exitWeight"];
    dock?: Vehicle["dock"];
    databaseOptions?: DatabaseOptions;
}

export type CreateVehicleUseCaseResponse = Vehicle;

@injectable()
export class CreateVehicleUseCase {
    constructor(
        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository
    ) {}

    async execute(
        request: CreateVehicleUseCaseRequest
    ): Promise<CreateVehicleUseCaseResponse> {
        const { databaseOptions, ...data } = request;

        const vehicle = Vehicle.create(data);

        return this.vehicleRepository.create(vehicle, databaseOptions);
    }
}
