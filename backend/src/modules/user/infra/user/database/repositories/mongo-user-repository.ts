import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { User } from "@/modules/user/domain/user/entities/user";
import {
    type CountUserOptions,
    type ListUserOptions,
    UserRepository,
} from "@/modules/user/domain/user/repositories/user-repository";
import { type FilterQuery, Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoUserMapper } from "../mappers/mongo-user-mapper";
import { type UserDocument, UserModel } from "../schemas/user.schema";

/**
 * Implementação Mongo do `UserRepository`.
 *
 * Pontos importantes:
 * - `findByEmail` é o único método que carrega o `passwordHash`
 *   (`.select("+passwordHash")`) — usado por LoginUseCase.
 * - `findMany`/`count` aplicam o mesmo filtro de busca para garantir que
 *   `total` bata com a página devolvida.
 */
@injectable()
export class MongoUserRepository extends UserRepository {
    async create(
        user: User,
        _databaseOptions?: DatabaseOptions
    ): Promise<User> {
        const doc = await UserModel.create(MongoUserMapper.toPersistency(user));
        return MongoUserMapper.toDomain(doc);
    }

    async findById(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<User | null> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError(
                "user.invalid-payload",
                HttpStatusCode.BAD_REQUEST
            );
        }
        const doc = await UserModel.findById(id).exec();
        if (!doc) return null;
        return MongoUserMapper.toDomain(doc);
    }

    async findByEmail(
        email: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<User | null> {
        const doc = await UserModel.findOne({ email: email.toLowerCase() })
            .select("+passwordHash")
            .exec();
        if (!doc) return null;
        return MongoUserMapper.toDomain(doc);
    }

    async findMany(
        options: ListUserOptions,
        _databaseOptions?: DatabaseOptions
    ): Promise<User[]> {
        const page = options.page ?? 1;
        const perPage = options.perPage ?? 20;
        const skip = (page - 1) * perPage;

        const filter = this.buildSearchFilter(options.q);

        const docs = await UserModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .exec();

        return docs.map((doc) => MongoUserMapper.toDomain(doc));
    }

    async count(
        options: CountUserOptions,
        _databaseOptions?: DatabaseOptions
    ): Promise<number> {
        const filter = this.buildSearchFilter(options.q);
        return UserModel.countDocuments(filter).exec();
    }

    async update(
        user: User,
        _databaseOptions?: DatabaseOptions
    ): Promise<User> {
        if (!user.id) {
            throw new UseCaseError(
                "user.invalid-payload",
                HttpStatusCode.BAD_REQUEST
            );
        }

        const doc = await UserModel.findByIdAndUpdate(
            user.id,
            MongoUserMapper.toPersistency(user),
            { new: true }
        ).exec();

        if (!doc) {
            throw new UseCaseError("user.not-found", HttpStatusCode.NOT_FOUND);
        }

        return MongoUserMapper.toDomain(doc);
    }

    async delete(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new UseCaseError(
                "user.invalid-payload",
                HttpStatusCode.BAD_REQUEST
            );
        }
        await UserModel.findByIdAndDelete(id).exec();
    }

    private buildSearchFilter(q?: string): FilterQuery<UserDocument> {
        if (!q || q.trim() === "") return {};
        const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        return { $or: [{ name: regex }, { email: regex }] };
    }
}
