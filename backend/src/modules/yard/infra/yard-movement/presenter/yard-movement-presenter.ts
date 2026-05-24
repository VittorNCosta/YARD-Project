import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";

export class YardMovementPresenter {
    static toHTTP(yardMovement: YardMovement): Record<string, unknown> {
        return {
            id: yardMovement.id,
            vehicleId: yardMovement.vehicleId,
            plateSnapshot: yardMovement.plateSnapshot,
            driverName: yardMovement.driverName,
            driverCpf: yardMovement.driverCpf,
            cargoType: yardMovement.cargoType,
            processType: yardMovement.processType,
            status: yardMovement.status,
            weighingRequired: yardMovement.weighingRequired,
            entryWeight: yardMovement.entryWeight,
            exitWeight: yardMovement.exitWeight,
            dock: yardMovement.dock,
            arrivalDate: yardMovement.arrivalDate,
            departureDate: yardMovement.departureDate,
            createdBy: yardMovement.createdBy,
            releasedBy: yardMovement.releasedBy,
            cancelledBy: yardMovement.cancelledBy,
            statusReason: yardMovement.statusReason,
            events: yardMovement.events,
            createdAt: yardMovement.createdAt,
            updatedAt: yardMovement.updatedAt,
        };
    }
}
