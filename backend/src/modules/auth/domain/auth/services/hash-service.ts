/**
 * Abstração de hashing de senha usada por todos os use cases de auth/user.
 *
 * Implementação concreta vive em
 * `infra/auth/services/bcrypt-hash.service.ts` e usa bcrypt com cost 12.
 * Em testes substituímos por `FakeHashService`.
 */
export abstract class HashService {
    abstract hash(plain: string): Promise<string>;
    abstract compare(plain: string, hashed: string): Promise<boolean>;
}
