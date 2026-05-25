import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { Dock } from "@/modules/yard/domain/dock/entities/dock";
import type { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { inject, injectable } from "tsyringe";

export interface CreateDockUseCaseRequest {
    code: string;
    name?: string;
    status?: DockStatus;
    maintenanceReason?: string;
    databaseOptions?: DatabaseOptions;
}

export type CreateDockUseCaseResponse = Dock;

@injectable()
export class CreateDockUseCase {
    constructor(
        @inject("DockRepository")
        private readonly dockRepository: DockRepository
    ) {}

    async execute(
        request: CreateDockUseCaseRequest
    ): Promise<CreateDockUseCaseResponse> {
        const { databaseOptions, ...data } = request;

        const existingDock = await this.dockRepository.findByCode(
            data.code,
            databaseOptions
        );

        if (existingDock) {
            throw new UseCaseError("dock.already-exists", HttpStatusCode.CONFLICT);
        }

        const dock = Dock.create(data);
        return this.dockRepository.create(dock, databaseOptions);
    }
}

