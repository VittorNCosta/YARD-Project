import { User } from "@/modules/user/domain/user/entities/user";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";

import { FakeHashService } from "@test/modules/auth/infra/auth/services/fake-hash.service";

interface MakeUserOverrides {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
}

const fakeHash = new FakeHashService();

/**
 * Factory para testes. Aceita `password` em texto puro, hash via FakeHashService
 * (`"hashed:" + password`).
 */
export async function makeUser(overrides: MakeUserOverrides = {}): Promise<User> {
    const password = overrides.password ?? "Password1";
    const passwordHash = await fakeHash.hash(password);

    return User.create({
        name: overrides.name ?? "Test User",
        email: overrides.email ?? "test@example.com",
        passwordHash,
        role: overrides.role ?? UserRole.USER,
    });
}
