import type { DatabaseOptions } from "@/core/types/database-options";

import type { YardMovement } from "../entities/yard-movement";

export abstract class YardMovementRepository {
    abstract create(
        yardMovement: YardMovement,
        databaseOptions?: DatabaseOptions
    ): Promise<YardMovement>;

    abstract findById(
        id: string,
        databaseOptions?: DatabaseOptions
    ): Promise<YardMovement | null>;

    abstract findMany(
        databaseOptions?: DatabaseOptions
    ): Promise<YardMovement[]>;

    abstract findOpenByPlateSnapshot(
        plateSnapshot: string,
        databaseOptions?: DatabaseOptions
    ): Promise<YardMovement | null>;

    abstract findDockedByDock(
        dock: string,
        databaseOptions?: DatabaseOptions
    ): Promise<YardMovement | null>;

    abstract update(
        yardMovement: YardMovement,
        databaseOptions?: DatabaseOptions
    ): Promise<YardMovement>;
}
