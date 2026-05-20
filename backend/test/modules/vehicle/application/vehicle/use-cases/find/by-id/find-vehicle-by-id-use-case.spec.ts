import { UseCaseError } from "@/core/errors/use-case-error";
import { FindVehicleByIdUseCase } from "@/modules/vehicle/application/vehicle/use-cases/find/by-id/find-vehicle-by-id-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let repository: InMemoryVehicleRepository;
let sut: FindVehicleByIdUseCase;

describe("Find vehicle by id use case", () => {
    beforeEach(() => {
        repository = new InMemoryVehicleRepository();
        sut = new FindVehicleByIdUseCase(repository);
    });

    it("should be able to find a vehicle by id", async () => {
        const created = await repository.create(makeVehicle());

        const result = await sut.execute({ id: created.id! });

        expect(result.id).toBe(created.id);
    });

    it("should be able to throw UseCaseError when vehicle does not exist", async () => {
        await expect(sut.execute({ id: "missing" })).rejects.toBeInstanceOf(
            UseCaseError
        );
    });
});
