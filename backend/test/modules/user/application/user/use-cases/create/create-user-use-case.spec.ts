import { UseCaseError } from "@/core/errors/use-case-error";
import { CreateUserUseCase } from "@/modules/user/application/user/use-cases/create/create-user-use-case";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { beforeEach, describe, expect, it } from "vitest";

import { FakeHashService } from "@test/modules/auth/infra/auth/services/fake-hash.service";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";

let userRepository: InMemoryUserRepository;
let hashService: FakeHashService;
let sut: CreateUserUseCase;

describe("Create user use case", () => {
    beforeEach(() => {
        userRepository = new InMemoryUserRepository();
        hashService = new FakeHashService();
        sut = new CreateUserUseCase(userRepository, hashService);
    });

    it("should be able to create a new user with hashed password and default role", async () => {
        const result = await sut.execute({
            name: "Alice",
            email: "alice@example.com",
            password: "Password1",
        });

        expect(result.id).toBeDefined();
        expect(result.email).toBe("alice@example.com");
        expect(result.role).toBe(UserRole.USER);
        expect(result.passwordHash).toBe("hashed:Password1");
        expect(userRepository.items).toHaveLength(1);
    });

    it("should be able to normalize email to lowercase before saving", async () => {
        const result = await sut.execute({
            name: "Bob",
            email: "  BOB@EXAMPLE.COM  ",
            password: "Password1",
        });

        expect(result.email).toBe("bob@example.com");
    });

    it("should be able to throw UseCaseError when email already exists", async () => {
        await sut.execute({
            name: "Carol",
            email: "carol@example.com",
            password: "Password1",
        });

        await expect(
            sut.execute({
                name: "Carol Twin",
                email: "carol@example.com",
                password: "Password1",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should be able to honour explicit admin role", async () => {
        const result = await sut.execute({
            name: "Admin",
            email: "admin@example.com",
            password: "Password1",
            role: UserRole.ADMIN,
        });

        expect(result.role).toBe(UserRole.ADMIN);
    });
});
