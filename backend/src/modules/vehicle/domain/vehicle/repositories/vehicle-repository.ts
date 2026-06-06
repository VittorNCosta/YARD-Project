import type { DatabaseOptions } from "@/core/types/database-options";

import type { Vehicle } from "../entities/vehicle";

/**
 * Filtro de período usado por métricas agregadas (lê `createdAt`).
 * Datas em UTC; o caller é responsável por normalizar o fuso horário.
 */
export interface VehicleAggregationPeriod {
    from?: Date;
    to?: Date;
}

/**
 * Resultado agregado consumido pelos use-cases de `reports`.
 *
 * As listas vêm normalizadas em pares `{ key, count }` para que o
 * use-case possa ranquear/totalizar sem precisar conhecer os valores
 * possíveis (não é o domínio quem decide quais tipos de veículo existem).
 *
 * `registrationsByMonth` traz o bucket `month` no formato `YYYY-MM`,
 * o que evita ambiguidade de fuso ao desenhar o gráfico de evolução.
 */
export interface VehicleAggregatedMetrics {
    total: number;
    countByType: Array<{ key: string; count: number }>;
    countByActiveStatus: Array<{ key: string; count: number }>;
    countByWeighingRequired: { required: number; notRequired: number };
    registrationsByMonth: Array<{ month: string; count: number }>;
}

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

    /**
     * Devolve métricas agregadas da frota num único round-trip.
     *
     * Implementações concretas devem fazer isso numa única consulta
     * agregada (Mongo `$facet`) para evitar N+1. O período é opcional e,
     * quando ausente, considera toda a base.
     */
    abstract aggregateMetrics(
        period?: VehicleAggregationPeriod,
        databaseOptions?: DatabaseOptions
    ): Promise<VehicleAggregatedMetrics>;
}
