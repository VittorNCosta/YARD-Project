import { Session } from "@/modules/auth/domain/auth/entities/session";
import { MongoSessionRepository } from "@/modules/auth/infra/auth/database/repositories/mongo-session-repository";
import { SessionModel } from "@/modules/auth/infra/auth/database/schemas/session.schema";
import { Types } from "mongoose";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    cleanMongo,
    startMongo,
    stopMongo,
} from "@test/helpers/mongo-memory";

let sut: MongoSessionRepository;

function buildSession(overrides: Partial<{ userId: string; expiresAt: Date }> = {}): Session {
    return Session.create({
        userId: overrides.userId ?? new Types.ObjectId().toString(),
        hashedRefresh: "$2b$12$placeholderhash",
        expiresAt:
            overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
}

describe("MongoSessionRepository (integration)", () => {
    beforeAll(async () => {
        await startMongo();
        sut = new MongoSessionRepository();
        await SessionModel.syncIndexes();
    });

    afterAll(async () => {
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    it("create persists and returns id", async () => {
        const created = await sut.create(buildSession());
        expect(created.id).toBeDefined();
        expect(typeof created.id).toBe("string");
        expect(created.id?.length).toBeGreaterThan(0);
    });

    it("findById returns null for valid-but-missing id", async () => {
        const ghostId = new Types.ObjectId().toString();
        const found = await sut.findById(ghostId);
        expect(found).toBeNull();
    });

    it("findById returns null for malformed id", async () => {
        // Não deve lançar — apenas devolver null para id inválido.
        const found = await sut.findById("not-a-real-objectid");
        expect(found).toBeNull();
    });

    it("revoke sets revokedAt and is idempotent", async () => {
        const created = await sut.create(buildSession());
        if (!created.id) throw new Error("expected id");

        await sut.revoke(created.id);
        const after = await sut.findById(created.id);
        expect(after).not.toBeNull();
        expect(after?.revokedAt).toBeInstanceOf(Date);

        // Idempotente: chamar de novo não deve lançar.
        await expect(sut.revoke(created.id)).resolves.toBeUndefined();
    });

    it("revokeAllForUser revokes only that user's active sessions", async () => {
        const userA = new Types.ObjectId().toString();
        const userB = new Types.ObjectId().toString();

        const aSess1 = await sut.create(buildSession({ userId: userA }));
        const aSess2 = await sut.create(buildSession({ userId: userA }));
        const bSess = await sut.create(buildSession({ userId: userB }));

        await sut.revokeAllForUser(userA);

        const aAfter1 = await sut.findById(aSess1.id!);
        const aAfter2 = await sut.findById(aSess2.id!);
        const bAfter = await sut.findById(bSess.id!);

        expect(aAfter1?.revokedAt).toBeInstanceOf(Date);
        expect(aAfter2?.revokedAt).toBeInstanceOf(Date);
        expect(bAfter?.revokedAt).toBeNull();
    });

    it("TTL index exists on expiresAt with expireAfterSeconds=0", async () => {
        // Lê os índices reais da collection no Mongo memory-server.
        const indexes = await SessionModel.collection.indexes();
        // Espera-se um índice cuja chave é { expiresAt: 1 } e expireAfterSeconds === 0.
        const ttl = indexes.find(
            (i) =>
                i.key &&
                Object.prototype.hasOwnProperty.call(i.key, "expiresAt") &&
                i.expireAfterSeconds === 0
        );
        expect(ttl).toBeDefined();
    });

    it("update on missing id throws session-revoked", async () => {
        // Construímos uma session sem id (ainda não persistida).
        const orphan = buildSession();
        await expect(sut.update(orphan)).rejects.toMatchObject({
            key: "auth.session-revoked",
        });
    });
});
