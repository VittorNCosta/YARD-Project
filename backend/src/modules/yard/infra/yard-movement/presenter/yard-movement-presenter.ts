import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";

export interface YardMovementActor {
    id?: string;
    name: string;
    email: string;
}

export type YardMovementActorMap = Map<string, YardMovementActor>;

export class YardMovementPresenter {
    static collectActorIds(yardMovements: YardMovement[]): string[] {
        const ids = new Set<string>();

        for (const yardMovement of yardMovements) {
            this.addActorId(ids, yardMovement.createdBy);
            this.addActorId(ids, yardMovement.releasedBy);
            this.addActorId(ids, yardMovement.cancelledBy);

            for (const event of yardMovement.events) {
                this.addActorId(ids, event.createdBy);
            }
        }

        return [...ids];
    }

    static toHTTP(
        yardMovement: YardMovement,
        actors: YardMovementActorMap = new Map()
    ): Record<string, unknown> {
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
            weightDifference: yardMovement.weightDifference,
            dock: yardMovement.dock,
            arrivalDate: yardMovement.arrivalDate,
            departureDate: yardMovement.departureDate,
            createdBy: yardMovement.createdBy,
            releasedBy: yardMovement.releasedBy,
            cancelledBy: yardMovement.cancelledBy,
            createdByUser: this.toActorHTTP(yardMovement.createdBy, actors),
            releasedByUser: this.toActorHTTP(yardMovement.releasedBy, actors),
            cancelledByUser: this.toActorHTTP(yardMovement.cancelledBy, actors),
            statusReason: yardMovement.statusReason,
            events: yardMovement.events.map((event) => ({
                ...event,
                createdByUser: this.toActorHTTP(event.createdBy, actors),
            })),
            createdAt: yardMovement.createdAt,
            updatedAt: yardMovement.updatedAt,
        };
    }

    private static addActorId(ids: Set<string>, id?: string): void {
        if (id?.trim()) {
            ids.add(id.trim());
        }
    }

    private static toActorHTTP(
        id: string | undefined,
        actors: YardMovementActorMap
    ): Record<string, unknown> | undefined {
        if (!id) {
            return undefined;
        }

        const actor = actors.get(id);
        if (!actor) {
            return { id };
        }

        return {
            id: actor.id,
            name: actor.name,
            email: actor.email,
        };
    }
}
