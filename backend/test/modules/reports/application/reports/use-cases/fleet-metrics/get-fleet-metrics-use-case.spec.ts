import { GetFleetMetricsUseCase } from "@/modules/reports/application/reports/use-cases/fleet-metrics/get-fleet-metrics-use-case";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { VehicleActiveStatus } from "@/modules/vehicle/domain/vehicle/enums/vehicle-active-status";
import { beforeEach, describe, expect, it } from "vitest";

import { makeUser } from "@test/modules/user/domain/user/entities/make-user";
import { InMemoryUserRepository } from "@test/modules/user/infra/user/repositories/in-memory-user-repository";
import { makeVehicle } from "@test/modules/vehicle/domain/vehicle/entities/make-vehicle";
import { InMemoryVehicleRepository } from "@test/modules/vehicle/infra/vehicle/repositories/in-memory-vehicle-repository";

let vehicleRepository: InMemoryVehicleRepository;
let userRepository: InMemoryUserRepository;
let sut: GetFleetMetricsUseCase;

describe("Get fleet metrics use case", () => {
    beforeEach(() => {
        vehicleRepository = new InMemoryVehicleRepository();
        userRepository = new InMemoryUserRepository();
        sut = new GetFleetMetricsUseCase(vehicleRepository, userRepository);
    });

    it("should be able to return zeroed report when there are no vehicles", async () => {
        const result = await sut.execute({ requesterRole: UserRole.USER });

        expect(result.kpis).toMatchObject({
            totalVehicles: 0,
            activePercentage: 0,
            weighingRequiredPercentage: 0,
            distinctVehicleTypes: 0,
        });
        expect(result.composition.byVehicleType).toEqual([]);
        expect(result.composition.byActiveStatus).toEqual([]);
        // weighing buckets sempre existem mesmo zerados, para o gráfico
        // poder renderizar consistentemente
        expect(result.composition.byWeighingRequired).toHaveLength(2);
        expect(result.registrationsByMonth).toEqual([]);
        expect(result.usersByRole).toBeUndefined();
    });

    it("should be able to aggregate vehicles by type, status and weighing", async () => {
        await vehicleRepository.create(
            makeVehicle({
                plate: "AAA-1111",
                vehicleType: "Truck",
                activeStatus: VehicleActiveStatus.ACTIVE,
                weighingRequired: true,
            })
        );
        await vehicleRepository.create(
            makeVehicle({
                plate: "BBB-2222",
                vehicleType: "Truck",
                activeStatus: VehicleActiveStatus.ACTIVE,
                weighingRequired: false,
            })
        );
        await vehicleRepository.create(
            makeVehicle({
                plate: "CCC-3333",
                vehicleType: "Van",
                activeStatus: VehicleActiveStatus.INACTIVE,
                weighingRequired: true,
            })
        );
        await vehicleRepository.create(
            makeVehicle({
                plate: "DDD-4444",
                vehicleType: "Carreta",
                weighingRequired: true,
            })
        );

        const result = await sut.execute({ requesterRole: UserRole.USER });

        expect(result.kpis.totalVehicles).toBe(4);
        expect(result.kpis.distinctVehicleTypes).toBe(3);
        // 3 ativos de 4 = 75
        expect(result.kpis.activePercentage).toBe(75);
        // 3 com pesagem de 4 = 75
        expect(result.kpis.weighingRequiredPercentage).toBe(75);

        const truck = result.composition.byVehicleType.find(
            (b) => b.key === "Truck"
        );
        expect(truck).toBeDefined();
        expect(truck?.count).toBe(2);

        const ativo = result.composition.byActiveStatus.find(
            (b) => b.key === "Ativo"
        );
        expect(ativo?.count).toBe(3);
    });

    it("should be able to filter by period using createdAt", async () => {
        await vehicleRepository.create(
            makeVehicle({
                plate: "AAA-1111",
                createdAt: new Date("2024-03-10T12:00:00Z"),
            })
        );
        await vehicleRepository.create(
            makeVehicle({
                plate: "BBB-2222",
                createdAt: new Date("2024-05-15T12:00:00Z"),
            })
        );
        await vehicleRepository.create(
            makeVehicle({
                plate: "CCC-3333",
                createdAt: new Date("2024-08-20T12:00:00Z"),
            })
        );

        const result = await sut.execute({
            requesterRole: UserRole.USER,
            from: new Date("2024-04-01T00:00:00Z"),
            to: new Date("2024-07-31T23:59:59Z"),
        });

        expect(result.kpis.totalVehicles).toBe(1);
        expect(result.registrationsByMonth).toEqual([
            { month: "2024-05", count: 1 },
        ]);
    });

    it("should be able to throw when period 'from' is after 'to'", async () => {
        await expect(
            sut.execute({
                requesterRole: UserRole.USER,
                from: new Date("2024-12-01T00:00:00Z"),
                to: new Date("2024-01-01T00:00:00Z"),
            })
        ).rejects.toThrow();
    });

    it("should be able to include usersByRole only when requester is admin", async () => {
        await userRepository.create(await makeUser({ role: UserRole.ADMIN }));
        await userRepository.create(
            await makeUser({ email: "u1@x.com", role: UserRole.USER })
        );
        await userRepository.create(
            await makeUser({ email: "u2@x.com", role: UserRole.USER })
        );

        const asUser = await sut.execute({ requesterRole: UserRole.USER });
        expect(asUser.usersByRole).toBeUndefined();

        const asAdmin = await sut.execute({ requesterRole: UserRole.ADMIN });
        expect(asAdmin.usersByRole).toBeDefined();

        const admins = asAdmin.usersByRole?.find((b) => b.role === "admin");
        const users = asAdmin.usersByRole?.find((b) => b.role === "user");
        expect(admins?.count).toBe(1);
        expect(users?.count).toBe(2);
    });
});
