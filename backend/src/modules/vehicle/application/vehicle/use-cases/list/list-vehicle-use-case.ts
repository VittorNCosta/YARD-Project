import type { DatabaseOptions } from "@/core/types/database-options";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { inject, injectable } from "tsyringe";

export interface ListVehicleUseCaseRequest {
    databaseOptions?: DatabaseOptions;
}

export type ListVehicleUseCaseResponse = Vehicle[];

@injectable()
export class ListVehicleUseCase {
    constructor(
        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository
    ) {}

    async execute(
        request: ListVehicleUseCaseRequest = {}
    ): Promise<ListVehicleUseCaseResponse> {
        return this.vehicleRepository.findMany(request.databaseOptions);
    }
}
