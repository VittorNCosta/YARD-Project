import { CreateVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/create/create-vehicle-use-case";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let repository: InMemoryVehicleRepository;
let sut: CreateVehicleUseCase;

describe("Create vehicle use case", () => {
    beforeEach(() => {
        repository = new InMemoryVehicleRepository();
        sut = new CreateVehicleUseCase(repository);
    });

    it("should be able to create a new vehicle with defaults applied", async () => {
        const result = await sut.execute({
            plate: "XYZ-9999",
            driverName: "Maria Test",
            cargoType: "Geral",
            status: "Ativo",
        });

        expect(result.plate).toBe("XYZ-9999");
        expect(result.activeStatus).toBe(VehicleActiveStatus.ACTIVE);
        expect(result.weighingRequired).toBe(false);
        expect(repository.items).toHaveLength(1);
    });

    it("should be able to create a vehicle with explicit activeStatus inactive", async () => {
        const result = await sut.execute({
            plate: "AAA-0000",
            driverName: "Driver",
            cargoType: "Geral",
            status: "Inativo",
            activeStatus: VehicleActiveStatus.INACTIVE,
        });

        expect(result.activeStatus).toBe(VehicleActiveStatus.INACTIVE);
    });
});
