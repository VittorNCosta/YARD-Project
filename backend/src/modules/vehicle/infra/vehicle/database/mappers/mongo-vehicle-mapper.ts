import { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";

import type { VehicleDocument } from "../schemas/vehicle.schema";

/**
 * Converte entre documento Mongoose e entidade de domínio.
 *
 * Ponto importante: o domínio carrega `id` como `string` (ObjectId
 * serializado). O presenter é quem decide se devolve `_id` ou `id` para o
 * cliente — o mapper mantém a identidade como `string` simples.
 */
export class MongoVehicleMapper {
    static toDomain(raw: VehicleDocument): Vehicle {
        return Vehicle.create({
            id: raw._id?.toString(),
            plate: raw.plate,
            driverName: raw.driverName,
            cargoType: raw.cargoType,
            status: raw.status,
            color: raw.color,
            driverCpf: raw.driverCpf,
            vehicleType: raw.vehicleType,
            weighingRequired: raw.weighingRequired,
            activeStatus: raw.activeStatus
                ? (raw.activeStatus as VehicleActiveStatus)
                : undefined,
            entryDate: raw.entryDate,
            arrivalDate: raw.arrivalDate,
            departureDate: raw.departureDate,
            releasedBy: raw.releasedBy,
            processType: raw.processType,
            entryWeight: raw.entryWeight,
            exitWeight: raw.exitWeight,
            dock: raw.dock,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    static toPersistency(vehicle: Vehicle): Partial<VehicleDocument> {
        return {
            plate: vehicle.plate,
            driverName: vehicle.driverName,
            cargoType: vehicle.cargoType,
            status: vehicle.status,
            color: vehicle.color,
            driverCpf: vehicle.driverCpf,
            vehicleType: vehicle.vehicleType,
            weighingRequired: vehicle.weighingRequired,
            activeStatus: vehicle.activeStatus,
            entryDate: vehicle.entryDate,
            arrivalDate: vehicle.arrivalDate,
            departureDate: vehicle.departureDate,
            releasedBy: vehicle.releasedBy,
            processType: vehicle.processType,
            entryWeight: vehicle.entryWeight,
            exitWeight: vehicle.exitWeight,
            dock: vehicle.dock,
        };
    }
}
