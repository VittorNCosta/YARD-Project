import { TokenHashService } from "@/modules/auth/domain/auth/services/token-hash-service";

/**
 * Fake determinístico do TokenHashService para testes.
 *
 * `hash(plain)` retorna `"hashed:" + plain`, espelhando o padrão do
 * `FakeHashService`. Permite asserts diretos sobre o valor armazenado.
 */
export class FakeTokenHashService extends TokenHashService {
    hash(plain: string): string {
        return `hashed:${plain}`;
    }
}
