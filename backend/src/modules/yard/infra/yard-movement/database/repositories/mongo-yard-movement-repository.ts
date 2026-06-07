import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import {
    isFinalYardMovementStatus,
    YardMovementStatus,
} from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoYardMovementMapper } from "../mappers/mongo-yard-movement-mapper";
import { YardMovementModel } from "../schemas/yard-movement.schema";

function isDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    return "code" in error && (error as { code?: unknown }).code === 11000;
}

function buildUpdatePayload(
    data: Partial<Record<keyof YardMovement, unknown>>
): Record<string, unknown> {
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ""> = {};

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) {
            $unset[key] = "";
        } else {
            $set[key] = value;
        }
    }

    return {
        ...(Object.keys($set).length > 0 ? { $set } : {}),
        ...(Object.keys($unset).length > 0 ? { $unset } : {}),
    };
}

@injectable()
export class MongoYardMovementRepository extends YardMovementRepository {
    async create(
        yardMovement: YardMovement,
        _databaseOptions?: DatabaseOptions
    ): Promise<YardMovement> {
        const doc = await YardMovementModel.create(
            MongoYardMovementMapper.toPersistency(yardMovement)
        );
        return MongoYardMovementMapper.toDomain(doc);
    }

    async findById(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<YardMovement | null> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError(
                "yard-movement.invalid-id",
                HttpStatusCode.BAD_REQUEST
            );
        }

        const doc = await YardMovementModel.findById(id).exec();
        if (!doc) return null;
        return MongoYardMovementMapper.toDomain(doc);
    }

    async findMany(
        _databaseOptions?: DatabaseOptions
    ): Promise<YardMovement[]> {
        const docs = await YardMovementModel.find()
            .sort({ createdAt: -1 })
            .exec();

        return docs.map((doc) => MongoYardMovementMapper.toDomain(doc));
    }

    async findOpenByPlateSnapshot(
        plateSnapshot: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<YardMovement | null> {
        const docs = await YardMovementModel.find({
            plateSnapshot,
        }).exec();

        const open = docs.find(
            (doc) => !isFinalYardMovementStatus(doc.status)
        );

        return open ? MongoYardMovementMapper.toDomain(open) : null;
    }

    async findDockedByDock(
        dock: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<YardMovement | null> {
        const doc = await YardMovementModel.findOne({
            dock,
            status: YardMovementStatus.DOCKED,
        }).exec();

        return doc ? MongoYardMovementMapper.toDomain(doc) : null;
    }

    async update(
        yardMovement: YardMovement,
        _databaseOptions?: DatabaseOptions
    ): Promise<YardMovement> {
        if (!yardMovement.id) {
            throw new UseCaseError(
                "yard-movement.invalid-id",
                HttpStatusCode.BAD_REQUEST
            );
        }

        try {
            const persistence =
                MongoYardMovementMapper.toPersistency(yardMovement);
            const doc = await YardMovementModel.findByIdAndUpdate(
                yardMovement.id,
                buildUpdatePayload(persistence),
                { new: true }
            ).exec();

            if (!doc) {
                throw new UseCaseError(
                    "yard-movement.not-found",
                    HttpStatusCode.NOT_FOUND
                );
            }

            return MongoYardMovementMapper.toDomain(doc);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new UseCaseError(
                    "yard-movement.dock-already-occupied",
                    HttpStatusCode.CONFLICT
                );
            }
            throw error;
        }
    }
}
