import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoVehicleMapper } from "../mappers/mongo-vehicle-mapper";
import { VehicleModel } from "../schemas/vehicle.schema";

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
}
