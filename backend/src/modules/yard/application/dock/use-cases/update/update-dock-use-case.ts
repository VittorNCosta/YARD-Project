import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Dock } from "@/modules/yard/domain/dock/entities/dock";
import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { inject, injectable } from "tsyringe";

export interface UpdateDockUseCaseRequest {
    id: string;
    code?: string;
    name?: string;
    status?: DockStatus;
    maintenanceReason?: string;
    databaseOptions?: DatabaseOptions;
}

export type UpdateDockUseCaseResponse = Dock;

@injectable()
export class UpdateDockUseCase {
    constructor(
        @inject("DockRepository")
        private readonly dockRepository: DockRepository,

        @inject("YardMovementRepository")
        private readonly yardMovementRepository: YardMovementRepository
    ) {}

    async execute(
        request: UpdateDockUseCaseRequest
    ): Promise<UpdateDockUseCaseResponse> {
        const { id, databaseOptions, ...updates } = request;

        const dock = await this.dockRepository.findById(id, databaseOptions);

        if (!dock) {
            throw new UseCaseError("dock.not-found", HttpStatusCode.NOT_FOUND);
        }

        if (updates.code !== undefined && updates.code !== dock.code) {
            const existingDock = await this.dockRepository.findByCode(
                updates.code,
                databaseOptions
            );

            if (existingDock && existingDock.id !== dock.id) {
                throw new UseCaseError(
                    "dock.already-exists",
                    HttpStatusCode.CONFLICT
                );
            }
        }

        await this.ensureDockCanBeUpdated(dock, updates, databaseOptions);

        dock.update(updates);
        return this.dockRepository.update(dock, databaseOptions);
    }

    private async ensureDockCanBeUpdated(
        dock: Dock,
        updates: Omit<UpdateDockUseCaseRequest, "id" | "databaseOptions">,
        databaseOptions?: DatabaseOptions
    ): Promise<void> {
        const statusWillBlockOperation =
            updates.status !== undefined &&
            updates.status !== DockStatus.ACTIVE;
        const codeWillChange =
            updates.code !== undefined && updates.code.trim() !== dock.code;

        if (!statusWillBlockOperation && !codeWillChange) {
            return;
        }

        const occupant = await this.yardMovementRepository.findDockedByDock(
            dock.code,
            databaseOptions
        );

        if (occupant) {
            throw new UseCaseError("dock.occupied", HttpStatusCode.CONFLICT);
        }
    }
}
