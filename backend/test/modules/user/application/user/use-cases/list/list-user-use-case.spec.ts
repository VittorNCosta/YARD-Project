import { ListUserUseCase } from "@/modules/user/application/user/use-cases/list/list-user-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeUser } from "@test/modules/user/domain/user/entities/make-user";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";

let userRepository: InMemoryUserRepository;
let sut: ListUserUseCase;

describe("List user use case", () => {
    beforeEach(() => {
        userRepository = new InMemoryUserRepository();
        sut = new ListUserUseCase(userRepository);
    });

    it("should be able to list users with pagination metadata", async () => {
        for (let i = 0; i < 25; i++) {
            await userRepository.create(
                await makeUser({
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                })
            );
        }

        const result = await sut.execute({ page: 1, perPage: 10 });

        expect(result.items).toHaveLength(10);
        expect(result.total).toBe(25);
        expect(result.page).toBe(1);
        expect(result.perPage).toBe(10);
    });

    it("should be able to return the second page", async () => {
        for (let i = 0; i < 25; i++) {
            await userRepository.create(
                await makeUser({
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                })
            );
        }

        const result = await sut.execute({ page: 2, perPage: 10 });

        expect(result.items).toHaveLength(10);
        expect(result.page).toBe(2);
    });

    it("should be able to filter by q (case-insensitive) on name OR email", async () => {
        await userRepository.create(
            await makeUser({ name: "Alice Wonderland", email: "alice@x.com" })
        );
        await userRepository.create(
            await makeUser({ name: "Bob Builder", email: "bob@x.com" })
        );
        await userRepository.create(
            await makeUser({ name: "Carol", email: "carol@alicegmail.com" })
        );

        const byName = await sut.execute({ q: "alice" });
        expect(byName.total).toBe(2);
        expect(byName.items.map((u) => u.email).sort()).toEqual([
            "alice@x.com",
            "carol@alicegmail.com",
        ]);

        const byEmail = await sut.execute({ q: "BOB@" });
        expect(byEmail.total).toBe(1);
        expect(byEmail.items[0]?.email).toBe("bob@x.com");
    });

    it("should be able to default page=1 perPage=20 when not provided", async () => {
        const result = await sut.execute();
        expect(result.page).toBe(1);
        expect(result.perPage).toBe(20);
    });
});
