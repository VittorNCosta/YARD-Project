import type { DatabaseOptions } from "@/core/types/database-options";
import type { User } from "@/modules/user/domain/user/entities/user";
import {
    type CountUserOptions,
    type ListUserOptions,
    UserRepository,
    type UserRoleCount,
} from "@/modules/user/domain/user/repositories/user-repository";

export class InMemoryUserRepository extends UserRepository {
    public items: User[] = [];
    private nextId = 1;

    async create(user: User, _options?: DatabaseOptions): Promise<User> {
        if (!user.id) {
            user.id = String(this.nextId++);
        }
        this.items.push(user);
        return user;
    }

    async findById(
        id: string,
        _options?: DatabaseOptions
    ): Promise<User | null> {
        return this.items.find((u) => u.id === id) ?? null;
    }

    async findByEmail(
        email: string,
        _options?: DatabaseOptions
    ): Promise<User | null> {
        const lower = email.toLowerCase();
        return this.items.find((u) => u.email.toLowerCase() === lower) ?? null;
    }

    async findMany(
        options: ListUserOptions,
        _databaseOptions?: DatabaseOptions
    ): Promise<User[]> {
        const filtered = this.applyFilter(options.q);
        const sorted = filtered.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        const page = options.page ?? 1;
        const perPage = options.perPage ?? 20;
        const start = (page - 1) * perPage;
        return sorted.slice(start, start + perPage);
    }

    async count(
        options: CountUserOptions,
        _databaseOptions?: DatabaseOptions
    ): Promise<number> {
        return this.applyFilter(options.q).length;
    }

    async countByRole(
        _databaseOptions?: DatabaseOptions
    ): Promise<UserRoleCount[]> {
        const buckets = new Map<User["role"], number>();
        for (const u of this.items) {
            buckets.set(u.role, (buckets.get(u.role) ?? 0) + 1);
        }
        return Array.from(buckets.entries()).map(([role, count]) => ({
            role,
            count,
        }));
    }

    async update(user: User, _options?: DatabaseOptions): Promise<User> {
        const index = this.items.findIndex((u) => u.id === user.id);
        if (index === -1) {
            throw new Error("user.not-found");
        }
        this.items[index] = user;
        return user;
    }

    async delete(id: string, _options?: DatabaseOptions): Promise<void> {
        this.items = this.items.filter((u) => u.id !== id);
    }

    private applyFilter(q?: string): User[] {
        if (!q || q.trim() === "") return [...this.items];
        const lower = q.trim().toLowerCase();
        return this.items.filter(
            (u) =>
                u.name.toLowerCase().includes(lower) ||
                u.email.toLowerCase().includes(lower)
        );
    }
}
