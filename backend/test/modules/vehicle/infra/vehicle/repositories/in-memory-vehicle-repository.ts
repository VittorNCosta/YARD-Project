import type { DatabaseOptions } from "@/core/types/database-options";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import {
    type VehicleAggregatedMetrics,
    type VehicleAggregationPeriod,
    VehicleRepository,
} from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";

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

    /**
     * Versão in-memory de `aggregateMetrics`. Espelha a semântica da impl
     * Mongo para que os unit tests do use-case sejam fiéis ao runtime real.
     */
    async aggregateMetrics(
        period?: VehicleAggregationPeriod,
        _databaseOptions?: DatabaseOptions
    ): Promise<VehicleAggregatedMetrics> {
        const from = period?.from?.getTime();
        const to = period?.to?.getTime();
        const filtered = this.items.filter((v) => {
            const ts = v.createdAt.getTime();
            if (from !== undefined && ts < from) return false;
            if (to !== undefined && ts > to) return false;
            return true;
        });

        const total = filtered.length;

        const typeMap = new Map<string, number>();
        const statusMap = new Map<string, number>();
        const monthMap = new Map<string, number>();
        let required = 0;
        let notRequired = 0;

        for (const v of filtered) {
            const type = v.vehicleType ?? "Outro";
            typeMap.set(type, (typeMap.get(type) ?? 0) + 1);

            const active = v.activeStatus ?? VehicleActiveStatus.ACTIVE;
            statusMap.set(active, (statusMap.get(active) ?? 0) + 1);

            if (v.weighingRequired) required += 1;
            else notRequired += 1;

            const month = `${v.createdAt.getUTCFullYear()}-${String(
                v.createdAt.getUTCMonth() + 1
            ).padStart(2, "0")}`;
            monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
        }

        const countByType = Array.from(typeMap.entries())
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count);

        const countByActiveStatus = Array.from(statusMap.entries()).map(
            ([key, count]) => ({ key, count })
        );

        const registrationsByMonth = Array.from(monthMap.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return {
            total,
            countByType,
            countByActiveStatus,
            countByWeighingRequired: { required, notRequired },
            registrationsByMonth,
        };
    }
}
