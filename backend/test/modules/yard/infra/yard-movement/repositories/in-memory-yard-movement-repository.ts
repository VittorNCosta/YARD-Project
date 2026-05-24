import type { DatabaseOptions } from "@/core/types/database-options";
import {
    isFinalYardMovementStatus,
    YardMovementStatus,
} from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";

export class InMemoryYardMovementRepository extends YardMovementRepository {
    public items: YardMovement[] = [];
    private nextId = 1;

    async create(
        yardMovement: YardMovement,
        _options?: DatabaseOptions
    ): Promise<YardMovement> {
        if (!yardMovement.id) {
            yardMovement.id = String(this.nextId++);
        }
        this.items.push(yardMovement);
        return yardMovement;
    }

    async findById(
        id: string,
        _options?: DatabaseOptions
    ): Promise<YardMovement | null> {
        return this.items.find((item) => item.id === id) ?? null;
    }

    async findMany(_options?: DatabaseOptions): Promise<YardMovement[]> {
        return [...this.items].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
    }

    async findOpenByPlateSnapshot(
        plateSnapshot: string,
        _options?: DatabaseOptions
    ): Promise<YardMovement | null> {
        return (
            this.items.find(
                (item) =>
                    item.plateSnapshot === plateSnapshot &&
                    !isFinalYardMovementStatus(item.status)
            ) ?? null
        );
    }

    async findDockedByDock(
        dock: string,
        _options?: DatabaseOptions
    ): Promise<YardMovement | null> {
        return (
            this.items.find(
                (item) =>
                    item.dock === dock &&
                    item.status === YardMovementStatus.DOCKED
            ) ?? null
        );
    }

    async update(
        yardMovement: YardMovement,
        _options?: DatabaseOptions
    ): Promise<YardMovement> {
        const index = this.items.findIndex(
            (item) => item.id === yardMovement.id
        );
        if (index === -1) {
            throw new Error("yard-movement.not-found");
        }
        this.items[index] = yardMovement;
        return yardMovement;
    }
}
