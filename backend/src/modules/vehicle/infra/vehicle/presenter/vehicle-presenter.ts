import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";

/**
 * COMPATIBILIDADE BIT-A-BIT com o contrato legado do Express.
 *
 * O frontend (src/hooks/useVehicles.ts, linha `id: v._id`) lê o identificador
 * como `_id` — formato raw do Mongo, NÃO `id`. Migrar para `id` é quebra de
 * contrato e será feito em fase futura junto com a atualização do frontend.
 *
 * Por isso devolvemos o envelope idêntico ao que o controller Express
 * retorna hoje:
 *   `{ _id, plate, driverName, cargoType, status, activeStatus,
 *      vehicleType, weighingRequired, createdAt, updatedAt, ... }`
 *
 * Qualquer mudança aqui DEVE ser sincronizada com useVehicles.ts e api.ts
 * do frontend.
 */
export class VehiclePresenter {
    static toHTTP(vehicle: Vehicle): Record<string, unknown> {
        return {
            _id: vehicle.id,
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
            createdAt: vehicle.createdAt,
            updatedAt: vehicle.updatedAt,
        };
    }
}
