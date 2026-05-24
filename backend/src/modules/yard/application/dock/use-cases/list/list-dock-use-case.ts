import type { DatabaseOptions } from "@/core/types/database-options";
import type { Dock } from "@/modules/yard/domain/dock/entities/dock";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { inject, injectable } from "tsyringe";

export interface ListDockUseCaseRequest {
    databaseOptions?: DatabaseOptions;
}

export type ListDockUseCaseResponse = Dock[];

@injectable()
export class ListDockUseCase {
    constructor(
        @inject("DockRepository")
        private readonly dockRepository: DockRepository
    ) {}

    async execute(
        request: ListDockUseCaseRequest = {}
    ): Promise<ListDockUseCaseResponse> {
        return this.dockRepository.findMany(request.databaseOptions);
    }
}

