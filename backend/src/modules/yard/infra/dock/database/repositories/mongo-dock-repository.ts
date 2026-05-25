import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Dock } from "@/modules/yard/domain/dock/entities/dock";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoDockMapper, normalizeDockCode } from "../mappers/mongo-dock-mapper";
import { DockModel } from "../schemas/dock.schema";

function isDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    return "code" in error && (error as { code?: unknown }).code === 11000;
}

@injectable()
export class MongoDockRepository extends DockRepository {
    async create(
        dock: Dock,
        _databaseOptions?: DatabaseOptions
    ): Promise<Dock> {
        try {
            const doc = await DockModel.create(MongoDockMapper.toPersistency(dock));
            return MongoDockMapper.toDomain(doc);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new UseCaseError("dock.already-exists", HttpStatusCode.CONFLICT);
            }
            throw error;
        }
    }

    async findById(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<Dock | null> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError("dock.invalid-id", HttpStatusCode.BAD_REQUEST);
        }

        const doc = await DockModel.findById(id).exec();
        return doc ? MongoDockMapper.toDomain(doc) : null;
    }

    async findByCode(
        code: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<Dock | null> {
        const doc = await DockModel.findOne({
            normalizedCode: normalizeDockCode(code),
        }).exec();

        return doc ? MongoDockMapper.toDomain(doc) : null;
    }

    async findMany(_databaseOptions?: DatabaseOptions): Promise<Dock[]> {
        const docs = await DockModel.find().sort({ normalizedCode: 1 }).exec();
        return docs.map((doc) => MongoDockMapper.toDomain(doc));
    }

    async update(
        dock: Dock,
        _databaseOptions?: DatabaseOptions
    ): Promise<Dock> {
        if (!dock.id) {
            throw new UseCaseError("dock.invalid-id", HttpStatusCode.BAD_REQUEST);
        }

        try {
            const doc = await DockModel.findByIdAndUpdate(
                dock.id,
                MongoDockMapper.toPersistency(dock),
                { new: true }
            ).exec();

            if (!doc) {
                throw new UseCaseError("dock.not-found", HttpStatusCode.NOT_FOUND);
            }

            return MongoDockMapper.toDomain(doc);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new UseCaseError("dock.already-exists", HttpStatusCode.CONFLICT);
            }
            throw error;
        }
    }

    async delete(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError("dock.invalid-id", HttpStatusCode.BAD_REQUEST);
        }

        await DockModel.findByIdAndDelete(id).exec();
    }
}

