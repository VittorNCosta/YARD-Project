import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import type { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { inject, injectable } from "tsyringe";

export interface CreateYardMovementUseCaseRequest {
    vehicleId: string;
    driverName: string;
    cargoType: string;
    createdBy?: string;
    driverCpf?: string;
    processType?: string;
    weighingRequired?: boolean;
    status?: YardMovementStatus;
    arrivalDate?: Date;
    databaseOptions?: DatabaseOptions;
}

export type CreateYardMovementUseCaseResponse = YardMovement;

@injectable()
export class CreateYardMovementUseCase {
    constructor(
        @inject("YardMovementRepository")
        private readonly yardMovementRepository: YardMovementRepository,

        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository
    ) {}

    async execute(
        request: CreateYardMovementUseCaseRequest
    ): Promise<CreateYardMovementUseCaseResponse> {
        const { databaseOptions, ...data } = request;

        if (!data.createdBy) {
            throw new UseCaseError(
                "auth.unauthenticated",
                HttpStatusCode.UNAUTHORIZED
            );
        }

        const vehicle = await this.vehicleRepository.findById(
            data.vehicleId,
            databaseOptions
        );

        if (!vehicle) {
            throw new UseCaseError(
                "vehicle.not-found",
                HttpStatusCode.NOT_FOUND
            );
        }

        if (
            vehicle.activeStatus === VehicleActiveStatus.INACTIVE ||
            vehicle.status === VehicleActiveStatus.INACTIVE
        ) {
            throw new UseCaseError(
                "yard-movement.vehicle-inactive",
                HttpStatusCode.CONFLICT
            );
        }

        const openMovement =
            await this.yardMovementRepository.findOpenByPlateSnapshot(
                vehicle.plate,
                databaseOptions
            );

        if (openMovement) {
            throw new UseCaseError(
                "yard-movement.open-movement-already-exists",
                HttpStatusCode.CONFLICT
            );
        }

        const yardMovement = YardMovement.create({
            vehicleId: data.vehicleId,
            plateSnapshot: vehicle.plate,
            driverName: data.driverName,
            driverCpf: data.driverCpf,
            cargoType: data.cargoType,
            processType: data.processType,
            weighingRequired:
                data.weighingRequired ?? vehicle.weighingRequired ?? false,
            status: data.status,
            arrivalDate: data.arrivalDate,
            createdBy: data.createdBy,
        });

        return this.yardMovementRepository.create(
            yardMovement,
            databaseOptions
        );
    }
}
