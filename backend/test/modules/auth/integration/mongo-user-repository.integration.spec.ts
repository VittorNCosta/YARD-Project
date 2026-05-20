import { User } from "@/modules/user/domain/user/entities/user";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { MongoUserRepository } from "@/modules/user/infra/user/database/repositories/mongo-user-repository";
import { UserModel } from "@/modules/user/infra/user/database/schemas/user.schema";
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

let sut: MongoUserRepository;

const HASH_PLACEHOLDER = "$2b$12$placeholderhashplaceholderhashplaceholder";

function buildUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return User.create({
        name: overrides.name ?? "Test User",
        email: overrides.email ?? "test@example.com",
        passwordHash: HASH_PLACEHOLDER,
        role: UserRole.USER,
    });
}

describe("MongoUserRepository (integration)", () => {
    beforeAll(async () => {
        await startMongo();
        sut = new MongoUserRepository();
        // Garantir índice único de email (o schema declara, mas memory-server
        // só constrói índices em buildIndexes).
        await UserModel.syncIndexes();
    });

    afterAll(async () => {
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    it("findByEmail returns user with passwordHash populated (select +passwordHash)", async () => {
        await sut.create(buildUser({ email: "alice@example.com" }));

        const found = await sut.findByEmail("alice@example.com");
        expect(found).not.toBeNull();
        expect(found?.passwordHash).toBe(HASH_PLACEHOLDER);
    });

    it("findById does NOT return passwordHash (select: false)", async () => {
        const created = await sut.create(buildUser({ email: "bob@example.com" }));
        if (!created.id) throw new Error("expected id");

        const found = await sut.findById(created.id);
        expect(found).not.toBeNull();
        // O Mongoose preserva `select: false` aqui — mapper transforma em "".
        expect(found?.passwordHash).toBe("");
    });

    it("email unique index rejects duplicate insert (E11000)", async () => {
        await sut.create(buildUser({ email: "dup@example.com" }));

        await expect(
            sut.create(buildUser({ email: "dup@example.com" }))
        ).rejects.toMatchObject({
            // mongoose envolve o E11000 em MongoServerError com code 11000
            code: 11000,
        });
    });

    it("findByEmail é case-insensitive (storage lowercased pelo schema)", async () => {
        // Schema tem lowercase: true, então mesmo passando "Mixed@Example.COM"
        // ele é gravado como "mixed@example.com".
        await sut.create(buildUser({ email: "Mixed@Example.COM" }));

        const found = await sut.findByEmail("MIXED@example.com");
        expect(found).not.toBeNull();
        expect(found?.email).toBe("mixed@example.com");
    });

    it("update preserves email when not changing (and roundtrip)", async () => {
        const created = await sut.create(buildUser({ email: "carol@example.com" }));
        if (!created.id) throw new Error("expected id");

        // Mudamos só o nome; email deve persistir intacto.
        created.name = "Carol Updated";
        const updated = await sut.update(created);

        expect(updated.email).toBe("carol@example.com");
        expect(updated.name).toBe("Carol Updated");
    });
});
