import type { DatabaseOptions } from "@/core/types/database-options";
import type { Session } from "@/modules/auth/domain/auth/entities/session";
import { SessionRepository } from "@/modules/auth/domain/auth/repositories/session-repository";

export class InMemorySessionRepository extends SessionRepository {
    public items: Session[] = [];
    private nextId = 1;

    async create(
        session: Session,
        _options?: DatabaseOptions
    ): Promise<Session> {
        if (!session.id) {
            session.id = String(this.nextId++);
        }
        this.items.push(session);
        return session;
    }

    async findById(
        id: string,
        _options?: DatabaseOptions
    ): Promise<Session | null> {
        return this.items.find((s) => s.id === id) ?? null;
    }

    async update(
        session: Session,
        _options?: DatabaseOptions
    ): Promise<Session> {
        const index = this.items.findIndex((s) => s.id === session.id);
        if (index === -1) {
            throw new Error("auth.session-revoked");
        }
        this.items[index] = session;
        return session;
    }

    async revoke(id: string, _options?: DatabaseOptions): Promise<void> {
        const session = this.items.find((s) => s.id === id);
        if (session) {
            session.revoke();
        }
    }

    async revokeAllForUser(
        userId: string,
        _options?: DatabaseOptions
    ): Promise<void> {
        for (const session of this.items) {
            if (session.userId === userId && !session.isRevoked()) {
                session.revoke();
            }
        }
    }
}
