import { BcryptHashService } from "@/modules/auth/infra/auth/services/bcrypt-hash.service";
import { beforeAll, describe, expect, it } from "vitest";

let sut: BcryptHashService;

describe("BcryptHashService (integration)", () => {
    beforeAll(() => {
        sut = new BcryptHashService();
    });

    it("hash + compare round-trip succeeds", async () => {
        const plain = "Sup3rSecret!";
        const hash = await sut.hash(plain);
        await expect(sut.compare(plain, hash)).resolves.toBe(true);
    });

    it("compare returns false for wrong plain", async () => {
        const hash = await sut.hash("Sup3rSecret!");
        await expect(sut.compare("WrongPass1", hash)).resolves.toBe(false);
    });

    it("hash output matches $2b$12$ format", async () => {
        const hash = await sut.hash("Password1");
        expect(hash).toMatch(/^\$2[ab]\$12\$/);
    });

    it("compare returns false for empty hashed (defensive)", async () => {
        // Caso onde o passwordHash veio vazio (ex.: User carregado sem
        // `select +passwordHash`) — não pode autenticar ninguém.
        await expect(sut.compare("Password1", "")).resolves.toBe(false);
    });

    it("two hashes of same plain produce different ciphertext (sal distinto)", async () => {
        const plain = "Password1";
        const a = await sut.hash(plain);
        const b = await sut.hash(plain);
        expect(a).not.toBe(b);
        // ambos são válidos contra o plain original
        await expect(sut.compare(plain, a)).resolves.toBe(true);
        await expect(sut.compare(plain, b)).resolves.toBe(true);
    });
});
