import { Session } from "@/modules/auth/domain/auth/entities/session";

import type { SessionDocument } from "../schemas/session.schema";

export class MongoSessionMapper {
    static toDomain(raw: SessionDocument): Session {
        return Session.create({
            id: raw._id?.toString(),
            userId: raw.userId.toString(),
            hashedRefresh: raw.hashedRefresh,
            expiresAt: raw.expiresAt,
            revokedAt: raw.revokedAt ?? null,
            userAgent: raw.userAgent ?? null,
            ip: raw.ip ?? null,
            createdAt: raw.createdAt,
        });
    }

    static toPersistency(session: Session): Partial<SessionDocument> {
        return {
            userId: session.userId,
            hashedRefresh: session.hashedRefresh,
            expiresAt: session.expiresAt,
            revokedAt: session.revokedAt ?? null,
            userAgent: session.userAgent ?? null,
            ip: session.ip ?? null,
        };
    }
}
