import { Vehicle } from "@/modules/vehicle/domain/vehicle/entities/vehicle";

/**
 * Factory para testes. Valores padrão coerentes com o schema obrigatório.
 */
export function makeVehicle(
    override: Partial<Parameters<typeof Vehicle.create>[0]> = {}
): Vehicle {
    return Vehicle.create({
        plate: "ABC-1234",
        driverName: "Joao Motorista",
        cargoType: "Geral",
        status: "Ativo",
        ...override,
    });
}
