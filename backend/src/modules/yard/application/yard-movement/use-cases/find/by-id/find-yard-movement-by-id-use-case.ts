import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { inject, injectable } from "tsyringe";

export interface FindYardMovementByIdUseCaseRequest {
    id: string;
    databaseOptions?: DatabaseOptions;
}

export type FindYardMovementByIdUseCaseResponse = YardMovement;

@injectable()
export class FindYardMovementByIdUseCase {
    constructor(
        @inject("YardMovementRepository")
        private readonly yardMovementRepository: YardMovementRepository
    ) {}

    async execute({
        id,
        databaseOptions,
    }: FindYardMovementByIdUseCaseRequest): Promise<FindYardMovementByIdUseCaseResponse> {
        const yardMovement = await this.yardMovementRepository.findById(
            id,
            databaseOptions
        );

        if (!yardMovement) {
            throw new UseCaseError(
                "yard-movement.not-found",
                HttpStatusCode.NOT_FOUND
            );
        }

        return yardMovement;
    }
}
