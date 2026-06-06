import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import {
    type VehicleAggregatedMetrics,
    type VehicleAggregationPeriod,
    VehicleRepository,
} from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { type FilterQuery, type PipelineStage, Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoVehicleMapper } from "../mappers/mongo-vehicle-mapper";
import { type VehicleDocument, VehicleModel } from "../schemas/vehicle.schema";

@injectable()
export class MongoVehicleRepository extends VehicleRepository {
    async create(
        vehicle: Vehicle,
        _databaseOptions?: DatabaseOptions
    ): Promise<Vehicle> {
        const doc = await VehicleModel.create(
            MongoVehicleMapper.toPersistency(vehicle)
        );
        return MongoVehicleMapper.toDomain(doc);
    }

    async findById(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<Vehicle | null> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError(
                "vehicle.invalid-id",
                HttpStatusCode.BAD_REQUEST
            );
        }

        const doc = await VehicleModel.findById(id).exec();
        if (!doc) return null;
        return MongoVehicleMapper.toDomain(doc);
    }

    async findMany(_databaseOptions?: DatabaseOptions): Promise<Vehicle[]> {
        const docs = await VehicleModel.find().sort({ createdAt: -1 }).exec();
        return docs.map((doc) => MongoVehicleMapper.toDomain(doc));
    }

    async update(
        vehicle: Vehicle,
        _databaseOptions?: DatabaseOptions
    ): Promise<Vehicle> {
        if (!vehicle.id) {
            throw new UseCaseError(
                "vehicle.invalid-id",
                HttpStatusCode.BAD_REQUEST
            );
        }

        const doc = await VehicleModel.findByIdAndUpdate(
            vehicle.id,
            MongoVehicleMapper.toPersistency(vehicle),
            { new: true }
        ).exec();

        if (!doc) {
            throw new UseCaseError(
                "vehicle.not-found",
                HttpStatusCode.NOT_FOUND
            );
        }

        return MongoVehicleMapper.toDomain(doc);
    }

    async delete(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError(
                "vehicle.invalid-id",
                HttpStatusCode.BAD_REQUEST
            );
        }

        await VehicleModel.findByIdAndDelete(id).exec();
    }

    /**
     * Agrega métricas de frota em uma única consulta usando `$facet`.
     *
     * Cada pipeline interno é independente — mesmo que um dos blocos
     * volte vazio (ex.: nenhum veículo cadastrado), os outros continuam
     * válidos. O caller (`get-fleet-metrics-use-case`) é quem decide
     * valores default para a UI.
     */
    async aggregateMetrics(
        period?: VehicleAggregationPeriod,
        _databaseOptions?: DatabaseOptions
    ): Promise<VehicleAggregatedMetrics> {
        const match: FilterQuery<VehicleDocument> = {};

        if (period?.from || period?.to) {
            match.createdAt = {};
            if (period.from) match.createdAt.$gte = period.from;
            if (period.to) match.createdAt.$lte = period.to;
        }

        const pipeline: PipelineStage[] = [
            { $match: match },
            {
                $facet: {
                    total: [{ $count: "value" }],
                    byType: [
                        {
                            $group: {
                                _id: { $ifNull: ["$vehicleType", "Outro"] },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { count: -1 } },
                    ],
                    byActiveStatus: [
                        {
                            $group: {
                                _id: {
                                    $ifNull: ["$activeStatus", "Ativo"],
                                },
                                count: { $sum: 1 },
                            },
                        },
                    ],
                    byWeighing: [
                        {
                            $group: {
                                _id: {
                                    $ifNull: ["$weighingRequired", false],
                                },
                                count: { $sum: 1 },
                            },
                        },
                    ],
                    registrationsByMonth: [
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: "%Y-%m",
                                        date: "$createdAt",
                                    },
                                },
                                count: { $sum: 1 },
                            },
                        },
                        { $sort: { _id: 1 } },
                    ],
                },
            },
        ];

        interface FacetBucket<TKey> {
            _id: TKey;
            count: number;
        }
        interface FacetResult {
            total: Array<{ value: number }>;
            byType: Array<FacetBucket<string | null>>;
            byActiveStatus: Array<FacetBucket<string | null>>;
            byWeighing: Array<FacetBucket<boolean | null>>;
            registrationsByMonth: Array<FacetBucket<string>>;
        }

        const [rawFacet] = await VehicleModel.aggregate<FacetResult>(
            pipeline
        ).exec();

        if (!rawFacet) {
            return {
                total: 0,
                countByType: [],
                countByActiveStatus: [],
                countByWeighingRequired: { required: 0, notRequired: 0 },
                registrationsByMonth: [],
            };
        }

        const total = rawFacet.total[0]?.value ?? 0;

        const countByType = rawFacet.byType.map((b) => ({
            key: b._id ?? "Outro",
            count: b.count,
        }));

        const countByActiveStatus = rawFacet.byActiveStatus.map((b) => ({
            key: b._id ?? "Ativo",
            count: b.count,
        }));

        let required = 0;
        let notRequired = 0;
        for (const bucket of rawFacet.byWeighing) {
            if (bucket._id === true) required += bucket.count;
            else notRequired += bucket.count;
        }

        const registrationsByMonth = rawFacet.registrationsByMonth.map(
            (b) => ({ month: b._id, count: b.count })
        );

        return {
            total,
            countByType,
            countByActiveStatus,
            countByWeighingRequired: { required, notRequired },
            registrationsByMonth,
        };
    }
}
