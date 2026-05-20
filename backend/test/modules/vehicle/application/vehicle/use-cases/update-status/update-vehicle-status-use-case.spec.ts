import { UseCaseError } from "@/core/errors/use-case-error";
import { UpdateVehicleStatusUseCase } from "@/modules/vehicle/application/vehicle/use-cases/update-status/update-vehicle-status-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let repository: InMemoryVehicleRepository;
let sut: UpdateVehicleStatusUseCase;

describe("Update vehicle status use case", () => {
    beforeEach(() => {
        repository = new InMemoryVehicleRepository();
        sut = new UpdateVehicleStatusUseCase(repository);
    });

    it("should be able to update the status of an existing vehicle", async () => {
        const created = await repository.create(
            makeVehicle({ status: "Ativo" })
        );

        const result = await sut.execute({
            id: created.id!,
            status: "Inativo",
        });

        expect(result.status).toBe("Inativo");
    });

    it("should be able to throw UseCaseError when vehicle does not exist", async () => {
        await expect(
            sut.execute({ id: "missing", status: "Inativo" })
        ).rejects.toBeInstanceOf(UseCaseError);
    });
});
