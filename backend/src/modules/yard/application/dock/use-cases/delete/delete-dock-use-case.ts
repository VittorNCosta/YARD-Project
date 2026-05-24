import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { inject, injectable } from "tsyringe";

export interface DeleteDockUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

@injectable()
export class DeleteDockUseCase {
    constructor(
        @inject("DockRepository")
        private readonly dockRepository: DockRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: DeleteDockUseCaseRequest): Promise<void> {
        const dock = await this.dockRepository.findById(id, databaseOptions);

        if (!dock) {
            throw new UseCaseError("dock.not-found", HttpStatusCode.NOT_FOUND);
        }

        await this.dockRepository.delete(id, databaseOptions);
    }
}

