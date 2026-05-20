import type { DatabaseOptions } from "@/core/types/database-options";

import type { Session } from "../entities/session";

export abstract class SessionRepository {
    abstract create(
        session: Session,
        databaseOptions?: DatabaseOptions
    ): Promise<Session>;

    abstract findById(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<Session | null>;

    abstract update(
        session: Session,
        databaseOptions?: DatabaseOptions
    ): Promise<Session>;

    abstract revoke(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;

    abstract revokeAllForUser(
        userId: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;
}
