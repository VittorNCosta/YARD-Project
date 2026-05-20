import { HashService } from "@/modules/auth/domain/auth/services/hash-service";
import bcrypt from "bcrypt";
import { injectable } from "tsyringe";

const BCRYPT_COST = 12;

/**
 * Implementação concreta de `HashService` usando bcrypt com cost 12.
 * 12 é o trade-off recomendado pelo OWASP em 2024 para hardware moderno
 * (≈ 250ms por hash em servidor x86, fora do P95 de uma request HTTP).
 */
@injectable()
export class BcryptHashService extends HashService {
    async hash(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_COST);
    }

    async compare(plain: string, hashed: string): Promise<boolean> {
        if (!hashed) return false;
        return bcrypt.compare(plain, hashed);
    }
}
