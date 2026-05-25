import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { inject, injectable } from "tsyringe";

export interface DeleteDockUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

@injectable()
export class DeleteDockUseCase {
    constructor(
        @inject("DockRepository")
        private readonly dockRepository: DockRepository,

        @inject("YardMovementRepository")
        private readonly yardMovementRepository: YardMovementRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: DeleteDockUseCaseRequest): Promise<void> {
        const dock = await this.dockRepository.findById(id, databaseOptions);

        if (!dock) {
            throw new UseCaseError("dock.not-found", HttpStatusCode.NOT_FOUND);
        }

        const occupant = await this.yardMovementRepository.findDockedByDock(
            dock.code,
            databaseOptions
        );

        if (occupant) {
            throw new UseCaseError("dock.occupied", HttpStatusCode.CONFLICT);
        }

        await this.dockRepository.delete(id, databaseOptions);
    }
}
