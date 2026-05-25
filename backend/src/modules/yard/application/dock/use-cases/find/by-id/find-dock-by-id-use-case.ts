import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { Dock } from "@/modules/yard/domain/dock/entities/dock";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { inject, injectable } from "tsyringe";

export interface FindDockByIdUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

export type FindDockByIdUseCaseResponse = Dock;

@injectable()
export class FindDockByIdUseCase {
    constructor(
        @inject("DockRepository")
        private readonly dockRepository: DockRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: FindDockByIdUseCaseRequest): Promise<FindDockByIdUseCaseResponse> {
        const dock = await this.dockRepository.findById(id, databaseOptions);

        if (!dock) {
            throw new UseCaseError("dock.not-found", HttpStatusCode.NOT_FOUND);
        }

        return dock;
    }
}

