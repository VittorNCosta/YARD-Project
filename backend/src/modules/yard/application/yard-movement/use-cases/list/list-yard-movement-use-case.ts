import type { DatabaseOptions } from "@/core/types/database-options";
import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { inject, injectable } from "tsyringe";

export interface ListYardMovementUseCaseRequest {
    databaseOptions?: DatabaseOptions;
}

export type ListYardMovementUseCaseResponse = YardMovement[];

@injectable()
export class ListYardMovementUseCase {
    constructor(
        @inject("YardMovementRepository")
        private readonly yardMovementRepository: YardMovementRepository
    ) {}

    async execute(
        request: ListYardMovementUseCaseRequest = {}
    ): Promise<ListYardMovementUseCaseResponse> {
        return this.yardMovementRepository.findMany(request.databaseOptions);
    }
}
