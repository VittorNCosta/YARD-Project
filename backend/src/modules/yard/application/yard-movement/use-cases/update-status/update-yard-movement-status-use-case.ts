import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { ChangeYardMovementStatusOptions } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { inject, injectable } from "tsyringe";

export interface UpdateYardMovementStatusUseCaseRequest
    extends ChangeYardMovementStatusOptions {
    id: string;
    status: YardMovementStatus;
    actorId?: string;
    databaseOptions?: DatabaseOptions;
}

export type UpdateYardMovementStatusUseCaseResponse = YardMovement;

@injectable()
export class UpdateYardMovementStatusUseCase {
    constructor(
        @inject("YardMovementRepository")
        private readonly yardMovementRepository: YardMovementRepository,

        @inject("DockRepository")
        private readonly dockRepository: DockRepository
    ) {}

    async execute(
        request: UpdateYardMovementStatusUseCaseRequest
    ): Promise<UpdateYardMovementStatusUseCaseResponse> {
        const { id, status, databaseOptions, ...options } = request;

        if (!options.actorId) {
            throw new UseCaseError(
                "auth.unauthenticated",
                HttpStatusCode.UNAUTHORIZED
            );
        }

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

        try {
            yardMovement.changeStatus(status, options);
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.startsWith("yard-movement.")
            ) {
                throw new UseCaseError(
                    error.message,
                    HttpStatusCode.BAD_REQUEST
                );
            }
            throw error;
        }

        await this.ensureDockCanReceiveMovement(yardMovement, databaseOptions);
        await this.ensureDockIsAvailable(yardMovement, databaseOptions);

        return this.yardMovementRepository.update(
            yardMovement,
            databaseOptions
        );
    }

    private async ensureDockIsAvailable(
        yardMovement: YardMovement,
        databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (
            yardMovement.status !== YardMovementStatus.DOCKED ||
            !yardMovement.dock
        ) {
            return;
        }

        const dockOccupant =
            await this.yardMovementRepository.findDockedByDock(
                yardMovement.dock,
                databaseOptions
            );

        if (dockOccupant && dockOccupant.id !== yardMovement.id) {
            throw new UseCaseError(
                "yard-movement.dock-already-occupied",
                HttpStatusCode.CONFLICT
            );
        }
    }

    private async ensureDockCanReceiveMovement(
        yardMovement: YardMovement,
        databaseOptions?: DatabaseOptions
    ): Promise<void> {
        if (
            yardMovement.status !== YardMovementStatus.DOCKED ||
            !yardMovement.dock
        ) {
            return;
        }

        const dock = await this.dockRepository.findByCode(
            yardMovement.dock,
            databaseOptions
        );

        if (!dock) {
            throw new UseCaseError("dock.not-found", HttpStatusCode.NOT_FOUND);
        }

        if (!dock.isActive()) {
            throw new UseCaseError(
                "dock.not-available",
                HttpStatusCode.CONFLICT
            );
        }
    }
}
