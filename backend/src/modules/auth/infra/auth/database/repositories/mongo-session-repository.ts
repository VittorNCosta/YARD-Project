import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Session } from "@/modules/auth/domain/auth/entities/session";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";
import { Types } from "mongoose";
import { injectable } from "tsyringe";

import { MongoSessionMapper } from "../mappers/mongo-session-mapper";
import { SessionModel } from "../schemas/session.schema";

@injectable()
export class MongoSessionRepository extends SessionRepository {
    async create(
        session: Session,
        _databaseOptions?: DatabaseOptions
    ): Promise<Session> {
        const doc = await SessionModel.create(
            MongoSessionMapper.toPersistency(session)
        );
        return MongoSessionMapper.toDomain(doc);
    }

    async findById(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<Session | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }
        const doc = await SessionModel.findById(id).exec();
        if (!doc) return null;
        return MongoSessionMapper.toDomain(doc);
    }

    async update(
        session: Session,
        _databaseOptions?: DatabaseOptions
    ): Promise<Session> {
        if (!session.id) {
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }
        const doc = await SessionModel.findByIdAndUpdate(
            session.id,
            MongoSessionMapper.toPersistency(session),
            { new: true }
        ).exec();
        if (!doc) {
            throw new UseCaseError(
                "auth.session-revoked",
                HttpStatusCode.UNAUTHORIZED
            );
        }
        return MongoSessionMapper.toDomain(doc);
    }

    async revoke(
        id: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            return;
        }
        await SessionModel.findByIdAndUpdate(id, {
            revokedAt: new Date(),
        }).exec();
    }

    async revokeAllForUser(
        userId: string,
        _databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (!Types.ObjectId.isValid(userId)) {
            return;
        }
        await SessionModel.updateMany(
            { userId, revokedAt: null },
            { $set: { revokedAt: new Date() } }
        ).exec();
    }
}
