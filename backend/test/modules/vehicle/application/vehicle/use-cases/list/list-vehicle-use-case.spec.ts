import { ListVehicleUseCase } from "@/modules/vehicle/application/vehicle/use-cases/list/list-vehicle-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let repository: InMemoryVehicleRepository;
let sut: ListVehicleUseCase;

describe("List vehicle use case", () => {
    beforeEach(() => {
        repository = new InMemoryVehicleRepository();
        sut = new ListVehicleUseCase(repository);
    });

    it("should be able to list all vehicles", async () => {
        await repository.create(makeVehicle({ plate: "AAA-1111" }));
        await repository.create(makeVehicle({ plate: "BBB-2222" }));

        const result = await sut.execute();

        expect(result).toHaveLength(2);
    });

    it("should be able to return an empty list when there are no vehicles", async () => {
        const result = await sut.execute();

        expect(result).toEqual([]);
    });
});
