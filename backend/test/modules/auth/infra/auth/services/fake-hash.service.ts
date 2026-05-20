import { HashService } from "@/modules/auth/domain/auth/services/hash-service";

/**
 * Fake determinístico para testes — `hash(plain)` retorna `"hashed:" + plain`
 * e `compare(plain, hashed)` checa a igualdade textual. Isso permite asserts
 * diretos sobre o valor armazenado sem depender do bcrypt (que é lento).
 */
export class FakeHashService extends HashService {
    async hash(plain: string): Promise<string> {
        return `hashed:${plain}`;
    }

    async compare(plain: string, hashed: string): Promise<boolean> {
        return hashed === `hashed:${plain}`;
    }
}
