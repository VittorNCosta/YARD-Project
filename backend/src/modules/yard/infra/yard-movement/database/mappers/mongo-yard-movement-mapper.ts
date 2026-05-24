import { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";

import type { YardMovementDocument } from "../schemas/yard-movement.schema";

export class MongoYardMovementMapper {
    static toDomain(raw: YardMovementDocument): YardMovement {
        return YardMovement.create({
            id: raw._id?.toString(),
            vehicleId: raw.vehicleId,
            plateSnapshot: raw.plateSnapshot,
            driverName: raw.driverName,
            cargoType: raw.cargoType,
            status: raw.status as YardMovementStatus,
            driverCpf: raw.driverCpf,
            processType: raw.processType,
            weighingRequired: raw.weighingRequired,
            entryWeight: raw.entryWeight,
            exitWeight: raw.exitWeight,
            dock: raw.dock,
            arrivalDate: raw.arrivalDate,
            departureDate: raw.departureDate,
            createdBy: raw.createdBy,
            releasedBy: raw.releasedBy,
            cancelledBy: raw.cancelledBy,
            statusReason: raw.statusReason,
            events: raw.events,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    static toPersistency(
        yardMovement: YardMovement
    ): Partial<YardMovementDocument> {
        return {
            vehicleId: yardMovement.vehicleId,
            plateSnapshot: yardMovement.plateSnapshot,
            driverName: yardMovement.driverName,
            cargoType: yardMovement.cargoType,
            status: yardMovement.status,
            driverCpf: yardMovement.driverCpf,
            processType: yardMovement.processType,
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
        };
    }
}
