import { UseCaseError } from "@/core/errors/use-case-error";
import { UpdateVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/update/update-vehicle-use-case";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { beforeEach, describe, expect, it } from "vitest";

import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let repository: InMemoryVehicleRepository;
let sut: UpdateVehicleUseCase;

describe("Update vehicle use case", () => {
    beforeEach(() => {
        repository = new InMemoryVehicleRepository();
        sut = new UpdateVehicleUseCase(repository);
    });

    it("should be able to update fields of an existing vehicle", async () => {
        const created = await repository.create(
            makeVehicle({ plate: "OLD-0000", driverName: "Old" })
        );

        const result = await sut.execute({
            id: created.id!,
            plate: "NEW-9999",
            driverName: "New",
            activeStatus: VehicleActiveStatus.INACTIVE,
        });

        expect(result.plate).toBe("NEW-9999");
        expect(result.driverName).toBe("New");
        expect(result.activeStatus).toBe(VehicleActiveStatus.INACTIVE);
    });

    it("should be able to leave unspecified fields unchanged", async () => {
        const created = await repository.create(
            makeVehicle({ plate: "ABC-1111", cargoType: "Original" })
        );

        const result = await sut.execute({
            id: created.id!,
            driverName: "Only This Changed",
        });

        expect(result.plate).toBe("ABC-1111");
        expect(result.cargoType).toBe("Original");
        expect(result.driverName).toBe("Only This Changed");
    });

    it("should be able to throw UseCaseError when vehicle does not exist", async () => {
        await expect(
            sut.execute({ id: "missing", plate: "XYZ-0000" })
        ).rejects.toBeInstanceOf(UseCaseError);
    });
});
