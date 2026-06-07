import type { DatabaseOptions } from "@/core/types/database-options";
import type { PasswordResetToken } from "@/modules/auth/domain/auth/entities/password-reset-token";
import { PasswordResetTokenRepository } from "@/modules/auth/domain/auth/repositories/password-reset-token-repository";
import { Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoPasswordResetTokenMapper } from "../mappers/mongo-password-reset-token-mapper";
import { PasswordResetTokenModel } from "../schemas/password-reset-token.schema";

@injectable()
export class MongoPasswordResetTokenRepository extends PasswordResetTokenRepository {
    async create(
        token: PasswordResetToken,
        _databaseOptions?: DatabaseOptions
    ): Promise<PasswordResetToken> {
        const doc = await PasswordResetTokenModel.create(
            MongoPasswordResetTokenMapper.toPersistency(token)
        );
        return MongoPasswordResetTokenMapper.toDomain(doc);
    }

    async findById(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<PasswordResetToken | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }
        const doc = await PasswordResetTokenModel.findById(id).exec();
        if (!doc) return null;
        return MongoPasswordResetTokenMapper.toDomain(doc);
    }

    async findByTokenHash(
        tokenHash: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<PasswordResetToken | null> {
        const doc = await PasswordResetTokenModel.findOne({ tokenHash }).exec();
        if (!doc) return null;
        return MongoPasswordResetTokenMapper.toDomain(doc);
    }

    async markUsed(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(id)) return;
        await PasswordResetTokenModel.findByIdAndUpdate(id, {
            $set: { usedAt: new Date() },
        }).exec();
    }

    async incrementFailedAttempts(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(id)) return;
        await PasswordResetTokenModel.findByIdAndUpdate(id, {
            $inc: { failedAttempts: 1 },
        }).exec();
    }

    async revokeAllUnusedForUser(
        userId: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(userId)) return;
        await PasswordResetTokenModel.updateMany(
            { userId, usedAt: null },
            { $set: { usedAt: new Date() } }
        ).exec();
    }

    async countUnusedCreatedAfter(
        userId: string,
        since: Date,
        _databaseOptions?: DatabaseOptions
    ): Promise<number> {
        if (!Types.ObjectId.isValid(userId)) return 0;
        return PasswordResetTokenModel.countDocuments({
            userId,
            createdAt: { $gte: since },
        }).exec();
    }
}
