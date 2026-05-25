import type { DatabaseOptions } from "@/core/types/database-options";

import type { Dock } from "../entities/dock";

export abstract class DockRepository {
    abstract create(
        dock: Dock,
        databaseOptions?: DatabaseOptions
    ): Promise<Dock>;

    abstract findById(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<Dock | null>;

    abstract findByCode(
        code: string,
        databaseOptions?: DatabaseOptions
    ): Promise<Dock | null>;

    abstract findMany(databaseOptions?: DatabaseOptions): Promise<Dock[]>;

    abstract update(
        dock: Dock,
        databaseOptions?: DatabaseOptions
    ): Promise<Dock>;

    abstract delete(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;
}

