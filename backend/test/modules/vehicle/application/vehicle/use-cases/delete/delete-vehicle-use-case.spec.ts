import { UseCaseError } from "@/core/errors/use-case-error";
import { DeleteVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/delete/delete-vehicle-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let repository: InMemoryVehicleRepository;
let sut: DeleteVehicleUseCase;

describe("Delete vehicle use case", () => {
    beforeEach(() => {
        repository = new InMemoryVehicleRepository();
        sut = new DeleteVehicleUseCase(repository);
    });

    it("should be able to delete an existing vehicle", async () => {
        const created = await repository.create(makeVehicle());

        await sut.execute({ id: created.id! });

        expect(repository.items).toHaveLength(0);
    });

    it("should be able to throw UseCaseError when deleting a missing vehicle", async () => {
        await expect(sut.execute({ id: "missing" })).rejects.toBeInstanceOf(
            UseCaseError
        );
    });
});
