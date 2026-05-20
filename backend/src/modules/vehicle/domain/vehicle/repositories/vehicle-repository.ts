import type { DatabaseOptions } from "@/core/types/database-options";

import type { Vehicle } from "../entities/vehicle";

/**
 * Contrato de persistência da entidade Vehicle.
 *
 * Abstract class (não interface) por convenção do STYLE_GUIDE — permite que
 * o tsyringe resolva via token string (`"VehicleRepository"`).
 */
export abstract class VehicleRepository {
    abstract create(
        vehicle: Vehicle,
        databaseOptions?: DatabaseOptions
    ): Promise<Vehicle>;

    abstract findById(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<Vehicle | null>;

    abstract findMany(
        databaseOptions?: DatabaseOptions
    ): Promise<Vehicle[]>;

    abstract update(
        vehicle: Vehicle,
        databaseOptions?: DatabaseOptions
    ): Promise<Vehicle>;

    abstract delete(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;
}
