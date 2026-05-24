import { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";

export function makeYardMovement(
    override: Partial<Parameters<typeof YardMovement.create>[0]> = {}
): YardMovement {
    return YardMovement.create({
        vehicleId: "vehicle-1",
        plateSnapshot: "ABC-1234",
        driverName: "Joao Motorista",
        cargoType: "Geral",
        ...override,
    });
}
