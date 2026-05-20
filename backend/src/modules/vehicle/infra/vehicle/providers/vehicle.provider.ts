import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { MongoVehicleRepository } from "@/modules/vehicle/infra/vehicle/database/repositories/mongo-vehicle-repository";
import { container } from "tsyringe";

/**
 * Bindings tsyringe do módulo Vehicle.
 * Carregado por efeito colateral via `src/infra/providers/index.ts`.
 */
container.registerSingleton<VehicleRepository>(
    "VehicleRepository",
    MongoVehicleRepository
);
