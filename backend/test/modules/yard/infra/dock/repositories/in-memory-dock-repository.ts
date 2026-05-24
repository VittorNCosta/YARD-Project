import type { DatabaseOptions } from "@/core/types/database-options";
import type { Dock } from "@/modules/yard/domain/dock/entities/dock";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";

function normalizeDockCode(code: string): string {
    return code.trim().toUpperCase();
}

export class InMemoryDockRepository extends DockRepository {
    public items: Dock[] = [];
    private nextId = 1;

    async create(
        dock: Dock,
        _options?: DatabaseOptions
    ): Promise<Dock> {
        if (!dock.id) {
            dock.id = String(this.nextId++);
        }
        this.items.push(dock);
        return dock;
    }

    async findById(
        id: string,
        _options?: DatabaseOptions
    ): Promise<Dock | null> {
        return this.items.find((item) => item.id === id) ?? null;
    }

    async findByCode(
        code: string,
        _options?: DatabaseOptions
    ): Promise<Dock | null> {
        const normalizedCode = normalizeDockCode(code);
        return (
            this.items.find(
                (item) => normalizeDockCode(item.code) === normalizedCode
            ) ?? null
        );
    }

    async findMany(_options?: DatabaseOptions): Promise<Dock[]> {
        return [...this.items].sort((a, b) => a.code.localeCompare(b.code));
    }

    async update(
        dock: Dock,
        _options?: DatabaseOptions
    ): Promise<Dock> {
        const index = this.items.findIndex((item) => item.id === dock.id);
        if (index === -1) {
            throw new Error("dock.not-found");
        }
        this.items[index] = dock;
        return dock;
    }

    async delete(id: string, _options?: DatabaseOptions): Promise<void> {
        this.items = this.items.filter((item) => item.id !== id);
    }
}

