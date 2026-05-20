import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import type { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { inject, injectable } from "tsyringe";

export interface UpdateVehicleUseCaseRequest {
    id: string;
    plate?: Vehicle["plate"];
    driverName?: Vehicle["driverName"];
    cargoType?: Vehicle["cargoType"];
    status?: Vehicle["status"];
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

export type UpdateVehicleUseCaseResponse = Vehicle;

/**
 * Atualiza um veículo inteiro. Campos não enviados permanecem como estão —
 * o controller já garantiu validação via Zod.
 *
 * A entidade de domínio é mutada em memória e persistida via repositório.
 * `updatedAt` é atualizado automaticamente.
 */
@injectable()
export class UpdateVehicleUseCase {
    constructor(
        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository
    ) {}

    async execute(
        request: UpdateVehicleUseCaseRequest
    ): Promise<UpdateVehicleUseCaseResponse> {
        const { id, databaseOptions, ...updates } = request;

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

        // Aplica só os campos definidos no payload.
        for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
            const value = updates[key];
            if (value !== undefined) {
                // Reatribuição segura: chaves vêm do Request interface.
                (vehicle as unknown as Record<string, unknown>)[key] = value;
            }
        }
        vehicle.updatedAt = new Date();

        return this.vehicleRepository.update(vehicle, databaseOptions);
    }
}
