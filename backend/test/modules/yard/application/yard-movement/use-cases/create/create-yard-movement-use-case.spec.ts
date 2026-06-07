import { UseCaseError } from "@/core/errors/use-case-error";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { CreateYardMovementUseCase } from "@/modules/yard/application/yard-movement/use-cases/create/create-yard-movement-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";
import { InMemoryYardMovementRepository } from "@test/modules/yard/infra/yard-movement/repositories/in-memory-yard-movement-repository";

let yardMovementRepository: InMemoryYardMovementRepository;
let vehicleRepository: InMemoryVehicleRepository;
let sut: CreateYardMovementUseCase;

describe("Create yard movement use case", () => {
    beforeEach(() => {
        yardMovementRepository = new InMemoryYardMovementRepository();
        vehicleRepository = new InMemoryVehicleRepository();
        sut = new CreateYardMovementUseCase(
            yardMovementRepository,
            vehicleRepository
        );
    });

    it("should be able to create a yard movement from an active vehicle", async () => {
        const vehicle = await vehicleRepository.create(
            makeVehicle({
                plate: "ABC-1234",
                weighingRequired: true,
            })
        );

        const result = await sut.execute({
            vehicleId: vehicle.id!,
            driverName: "Joao Motorista",
            cargoType: "Geral",
            createdBy: "user-1",
        });

        expect(result.vehicleId).toBe(vehicle.id);
        expect(result.plateSnapshot).toBe("ABC-1234");
        expect(result.status).toBe(YardMovementStatus.WAITING_QUEUE);
        expect(result.weighingRequired).toBe(true);
        expect(result.createdBy).toBe("user-1");
        expect(yardMovementRepository.items).toHaveLength(1);
    });

    it("should not be able to create a movement for inactive vehicle", async () => {
        const vehicle = await vehicleRepository.create(
            makeVehicle({
                activeStatus: VehicleActiveStatus.INACTIVE,
                status: "Inativo",
            })
        );

        await expect(
            sut.execute({
                vehicleId: vehicle.id!,
                driverName: "Joao Motorista",
                cargoType: "Geral",
                createdBy: "user-1",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should use only the vehicle weighing setting", async () => {
        const vehicle = await vehicleRepository.create(
            makeVehicle({
                weighingRequired: false,
            })
        );

        const result = await sut.execute({
            vehicleId: vehicle.id!,
            driverName: "Joao Motorista",
            cargoType: "Geral",
            createdBy: "user-1",
            weighingRequired: true,
        } as Parameters<typeof sut.execute>[0]);

        expect(result.weighingRequired).toBe(false);
    });

    it("should not be able to create two open movements for the same plate", async () => {
        const vehicle = await vehicleRepository.create(
            makeVehicle({ plate: "DEF-5678" })
        );

        await sut.execute({
            vehicleId: vehicle.id!,
            driverName: "Joao Motorista",
            cargoType: "Geral",
            createdBy: "user-1",
        });

        await expect(
            sut.execute({
                vehicleId: vehicle.id!,
                driverName: "Maria Motorista",
                cargoType: "Alimentos",
                createdBy: "user-2",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });
});
