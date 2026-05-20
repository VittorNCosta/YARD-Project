import type { DatabaseOptions } from "@/core/types/database-options";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";

/**
 * Repositório in-memory para testes unitários.
 * Gera ids sequenciais (`"1"`, `"2"`, ...) ao invés de ObjectId real.
 */
export class InMemoryVehicleRepository extends VehicleRepository {
    public items: Vehicle[] = [];
    private nextId = 1;

    async create(
        vehicle: Vehicle,
        _options?: DatabaseOptions
    ): Promise<Vehicle> {
        if (!vehicle.id) {
            vehicle.id = String(this.nextId++);
        }
        this.items.push(vehicle);
        return vehicle;
    }

    async findById(
        id: string,
        _options?: DatabaseOptions
    ): Promise<Vehicle | null> {
        return this.items.find((v) => v.id === id) ?? null;
    }

    async findMany(_options?: DatabaseOptions): Promise<Vehicle[]> {
        return [...this.items].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
    }

    async update(
        vehicle: Vehicle,
        _options?: DatabaseOptions
    ): Promise<Vehicle> {
        const index = this.items.findIndex((v) => v.id === vehicle.id);
        if (index === -1) {
            throw new Error("vehicle.not-found");
        }
        this.items[index] = vehicle;
        return vehicle;
    }

    async delete(id: string, _options?: DatabaseOptions): Promise<void> {
        this.items = this.items.filter((v) => v.id !== id);
    }
}
