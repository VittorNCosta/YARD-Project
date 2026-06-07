import { PasswordResetToken } from "@/modules/auth/domain/auth/entities/password-reset-token";
import { MongoPasswordResetTokenRepository } from "@/modules/auth/infra/auth/database/repositories/mongo-password-reset-token-repository";
import { PasswordResetTokenModel } from "@/modules/auth/infra/auth/database/schemas/password-reset-token.schema";
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

let sut: MongoPasswordResetTokenRepository;

function buildToken(
    overrides: Partial<{
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        createdAt: Date;
    }> = {}
): PasswordResetToken {
    return PasswordResetToken.create({
        userId: overrides.userId ?? new Types.ObjectId().toString(),
        tokenHash:
            overrides.tokenHash ??
            "hash-" + Math.random().toString(36).slice(2),
        expiresAt:
            overrides.expiresAt ??
            new Date(Date.now() + 30 * 60 * 1000),
        createdAt: overrides.createdAt,
    });
}

describe("MongoPasswordResetTokenRepository (integration)", () => {
    beforeAll(async () => {
        await startMongo();
        sut = new MongoPasswordResetTokenRepository();
        await PasswordResetTokenModel.syncIndexes();
    });

    afterAll(async () => {
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    it("create persists and returns id", async () => {
        const created = await sut.create(buildToken());
        expect(created.id).toBeDefined();
        expect(typeof created.id).toBe("string");
        expect(created.id?.length).toBeGreaterThan(0);
    });

    it("findById round-trip", async () => {
        const created = await sut.create(buildToken());
        const found = await sut.findById(created.id!);
        expect(found).not.toBeNull();
        expect(found?.tokenHash).toBe(created.tokenHash);
    });

    it("findByTokenHash returns the right doc", async () => {
        const created = await sut.create(
            buildToken({ tokenHash: "needle-hash" })
        );
        await sut.create(buildToken({ tokenHash: "haystack-hash-1" }));
        await sut.create(buildToken({ tokenHash: "haystack-hash-2" }));

        const found = await sut.findByTokenHash("needle-hash");
        expect(found?.id).toBe(created.id);
    });

    it("findByTokenHash returns null when missing", async () => {
        const found = await sut.findByTokenHash("missing-hash");
        expect(found).toBeNull();
    });

    it("markUsed flips usedAt", async () => {
        const created = await sut.create(buildToken());
        await sut.markUsed(created.id!);

        const after = await sut.findById(created.id!);
        expect(after?.usedAt).toBeInstanceOf(Date);
    });

    it("revokeAllUnusedForUser only affects unused docs of that user", async () => {
        const userA = new Types.ObjectId().toString();
        const userB = new Types.ObjectId().toString();

        const a1 = await sut.create(buildToken({ userId: userA }));
        const a2 = await sut.create(buildToken({ userId: userA }));
        // a3 já está usado — não deve ser revogado de novo (mas o updateMany
        // filtra por usedAt: null, então ele fica como estava).
        const a3 = await sut.create(buildToken({ userId: userA }));
        await sut.markUsed(a3.id!);
        const a3UsedAtBefore = (await sut.findById(a3.id!))?.usedAt;

        const b1 = await sut.create(buildToken({ userId: userB }));

        await sut.revokeAllUnusedForUser(userA);

        expect((await sut.findById(a1.id!))?.usedAt).toBeInstanceOf(Date);
        expect((await sut.findById(a2.id!))?.usedAt).toBeInstanceOf(Date);
        // a3 já estava usado — usedAt não foi sobrescrito.
        expect((await sut.findById(a3.id!))?.usedAt?.getTime()).toBe(
            a3UsedAtBefore?.getTime()
        );
        // b1 (outro user) intacto.
        expect((await sut.findById(b1.id!))?.usedAt).toBeNull();
    });

    it("countUnusedCreatedAfter counts user's recent tokens", async () => {
        const userA = new Types.ObjectId().toString();
        const userB = new Types.ObjectId().toString();

        await sut.create(buildToken({ userId: userA }));
        await sut.create(buildToken({ userId: userA }));
        await sut.create(buildToken({ userId: userB }));

        const since = new Date(Date.now() - 60_000);
        const count = await sut.countUnusedCreatedAfter(userA, since);
        expect(count).toBe(2);
    });

    it("TTL index exists on expiresAt with expireAfterSeconds=0", async () => {
        const indexes =
            await PasswordResetTokenModel.collection.indexes();
        const ttl = indexes.find(
            (i) =>
                i.key &&
                Object.prototype.hasOwnProperty.call(i.key, "expiresAt") &&
                i.expireAfterSeconds === 0
        );
        expect(ttl).toBeDefined();
    });

    it("tokenHash has a unique index", async () => {
        const indexes =
            await PasswordResetTokenModel.collection.indexes();
        const unique = indexes.find(
            (i) =>
                i.key &&
                Object.prototype.hasOwnProperty.call(i.key, "tokenHash") &&
                i.unique === true
        );
        expect(unique).toBeDefined();
    });
});
