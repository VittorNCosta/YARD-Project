import type { Optional } from "@/core/types/optional";

import { YardMovementStatus } from "../enums/yard-movement-status";
import { canTransitionYardMovementStatus } from "../services/yard-movement-transition";

export type YardMovementEventType = "CREATED" | "STATUS_CHANGED";

export interface YardMovementEventData {
    entryWeight?: number;
    exitWeight?: number;
    dock?: string;
    departureDate?: Date;
}

export interface YardMovementEvent {
    type: YardMovementEventType;
    fromStatus?: YardMovementStatus;
    toStatus: YardMovementStatus;
    statusReason?: string;
    createdBy?: string;
    createdAt: Date;
    data?: YardMovementEventData;
}

export interface YardMovementProps {
    id?: string;
    vehicleId: string;
    plateSnapshot: string;
    driverName: string;
    cargoType: string;
    status: YardMovementStatus;
    driverCpf?: string;
    processType?: string;
    weighingRequired: boolean;
    entryWeight?: number;
    exitWeight?: number;
    dock?: string;
    arrivalDate: Date;
    departureDate?: Date;
    createdBy?: string;
    releasedBy?: string;
    cancelledBy?: string;
    statusReason?: string;
    events: YardMovementEvent[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ChangeYardMovementStatusOptions {
    entryWeight?: number;
    exitWeight?: number;
    dock?: string;
    actorId?: string;
    releasedBy?: string;
    statusReason?: string;
    departureDate?: Date;
}

export class YardMovement {
    id?: string;
    vehicleId: string;
    plateSnapshot: string;
    driverName: string;
    cargoType: string;
    status: YardMovementStatus;
    driverCpf?: string;
    processType?: string;
    weighingRequired: boolean;
    entryWeight?: number;
    exitWeight?: number;
    dock?: string;
    arrivalDate: Date;
    departureDate?: Date;
    createdBy?: string;
    releasedBy?: string;
    cancelledBy?: string;
    statusReason?: string;
    events: YardMovementEvent[];
    createdAt: Date;
    updatedAt: Date;

    private constructor(props: YardMovementProps) {
        this.id = props.id;
        this.vehicleId = props.vehicleId;
        this.plateSnapshot = props.plateSnapshot;
        this.driverName = props.driverName;
        this.cargoType = props.cargoType;
        this.status = props.status;
        this.driverCpf = props.driverCpf;
        this.processType = props.processType;
        this.weighingRequired = props.weighingRequired;
        this.entryWeight = props.entryWeight;
        this.exitWeight = props.exitWeight;
        this.dock = props.dock;
        this.arrivalDate = props.arrivalDate;
        this.departureDate = props.departureDate;
        this.createdBy = props.createdBy;
        this.releasedBy = props.releasedBy;
        this.cancelledBy = props.cancelledBy;
        this.statusReason = props.statusReason;
        this.events = props.events;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    get weightDifference(): number | undefined {
        if (
            !this.hasPositiveWeight(this.entryWeight) ||
            !this.hasPositiveWeight(this.exitWeight)
        ) {
            return undefined;
        }

        return this.exitWeight! - this.entryWeight!;
    }

    static create(
        props: Optional<
            YardMovementProps,
            | "id"
            | "status"
            | "driverCpf"
            | "processType"
            | "weighingRequired"
            | "entryWeight"
            | "exitWeight"
            | "dock"
            | "arrivalDate"
            | "departureDate"
            | "createdBy"
            | "releasedBy"
            | "cancelledBy"
            | "statusReason"
            | "events"
            | "createdAt"
            | "updatedAt"
        >
    ): YardMovement {
        const now = new Date();
        const status = props.status ?? YardMovementStatus.WAITING_QUEUE;
        const createdAt = props.createdAt ?? now;
        return new YardMovement({
            ...props,
            status,
            weighingRequired: props.weighingRequired ?? false,
            arrivalDate: props.arrivalDate ?? now,
            events:
                props.events ??
                [
                    {
                        type: "CREATED",
                        toStatus: status,
                        createdBy: props.createdBy,
                        createdAt,
                    },
                ],
            createdAt,
            updatedAt: props.updatedAt ?? now,
        });
    }

    changeStatus(
        nextStatus: YardMovementStatus,
        options: ChangeYardMovementStatusOptions = {}
    ): void {
        if (!canTransitionYardMovementStatus(this.status, nextStatus)) {
            throw new Error("yard-movement.invalid-status-transition");
        }

        const previousStatus = this.status;
        this.ensureTransitionBusinessRules(nextStatus, options);
        this.applyTransitionData(nextStatus, options);

        this.status = nextStatus;
        this.updatedAt = new Date();
        this.recordStatusChange(previousStatus, nextStatus, options);
    }

    private ensureTransitionBusinessRules(
        nextStatus: YardMovementStatus,
        options: ChangeYardMovementStatusOptions
    ): void {
        if (
            this.status === YardMovementStatus.GATE_CHECK &&
            nextStatus === YardMovementStatus.ENTRY_WEIGHING &&
            !this.weighingRequired
        ) {
            throw new Error("yard-movement.weighing-not-required");
        }

        if (
            this.status === YardMovementStatus.GATE_CHECK &&
            nextStatus === YardMovementStatus.YARD &&
            this.weighingRequired
        ) {
            throw new Error("yard-movement.entry-weighing-required");
        }

        if (
            this.status === YardMovementStatus.ENTRY_WEIGHING &&
            nextStatus === YardMovementStatus.YARD &&
            !this.hasPositiveWeight(options.entryWeight ?? this.entryWeight)
        ) {
            throw new Error("yard-movement.entry-weight-required");
        }

        if (
            this.status === YardMovementStatus.YARD &&
            nextStatus === YardMovementStatus.DOCKED &&
            !this.hasText(options.dock ?? this.dock)
        ) {
            throw new Error("yard-movement.dock-required");
        }

        if (
            this.status === YardMovementStatus.AWAITING_RELEASE &&
            nextStatus === YardMovementStatus.EXIT_WEIGHING &&
            !this.weighingRequired
        ) {
            throw new Error("yard-movement.exit-weighing-not-required");
        }

        if (
            this.status === YardMovementStatus.AWAITING_RELEASE &&
            nextStatus === YardMovementStatus.RELEASED &&
            this.weighingRequired
        ) {
            throw new Error("yard-movement.exit-weighing-required");
        }

        if (
            nextStatus === YardMovementStatus.RELEASED &&
            !this.hasText(this.getActorId(options) ?? this.releasedBy)
        ) {
            throw new Error("yard-movement.released-by-required");
        }

        if (
            this.status === YardMovementStatus.EXIT_WEIGHING &&
            nextStatus === YardMovementStatus.RELEASED &&
            !this.hasPositiveWeight(options.exitWeight ?? this.exitWeight)
        ) {
            throw new Error("yard-movement.exit-weight-required");
        }

        if (
            this.requiresStatusReason(nextStatus) &&
            !this.hasText(options.statusReason)
        ) {
            throw new Error("yard-movement.status-reason-required");
        }

        if (
            nextStatus === YardMovementStatus.CANCELLED &&
            !this.hasText(this.getActorId(options))
        ) {
            throw new Error("yard-movement.cancelled-by-required");
        }
    }

    private applyTransitionData(
        nextStatus: YardMovementStatus,
        options: ChangeYardMovementStatusOptions
    ): void {
        if (options.entryWeight !== undefined) {
            this.entryWeight = options.entryWeight;
        }

        if (options.exitWeight !== undefined) {
            this.exitWeight = options.exitWeight;
        }

        if (options.dock !== undefined) {
            this.dock = options.dock.trim();
        }

        if (options.statusReason !== undefined) {
            this.statusReason = options.statusReason.trim();
        }

        const actorId = this.getActorId(options);

        if (nextStatus === YardMovementStatus.RELEASED && actorId) {
            this.releasedBy = actorId;
        }

        if (nextStatus === YardMovementStatus.CANCELLED && actorId) {
            this.cancelledBy = actorId;
        }

        if (nextStatus === YardMovementStatus.AWAITING_RELEASE) {
            this.dock = undefined;
        }

        if (nextStatus === YardMovementStatus.FINISHED) {
            this.departureDate = options.departureDate ?? new Date();
        }
    }

    private recordStatusChange(
        fromStatus: YardMovementStatus,
        toStatus: YardMovementStatus,
        options: ChangeYardMovementStatusOptions
    ): void {
        const data = this.getEventData(options);

        this.events.push({
            type: "STATUS_CHANGED",
            fromStatus,
            toStatus,
            statusReason: options.statusReason?.trim(),
            createdBy: this.getActorId(options),
            createdAt: this.updatedAt,
            data: Object.keys(data).length > 0 ? data : undefined,
        });
    }

    private getEventData(
        options: ChangeYardMovementStatusOptions
    ): YardMovementEventData {
        const data: YardMovementEventData = {};

        if (options.entryWeight !== undefined) {
            data.entryWeight = options.entryWeight;
        }

        if (options.exitWeight !== undefined) {
            data.exitWeight = options.exitWeight;
        }

        if (options.dock !== undefined) {
            data.dock = options.dock.trim();
        }

        if (options.departureDate !== undefined) {
            data.departureDate = options.departureDate;
        }

        return data;
    }

    private getActorId(
        options: ChangeYardMovementStatusOptions
    ): string | undefined {
        return options.actorId?.trim() || options.releasedBy?.trim();
    }

    private hasPositiveWeight(weight: number | undefined): boolean {
        return weight !== undefined && Number.isFinite(weight) && weight > 0;
    }

    private hasText(value: string | undefined): boolean {
        return value !== undefined && value.trim().length > 0;
    }

    private requiresStatusReason(status: YardMovementStatus): boolean {
        return (
            status === YardMovementStatus.CANCELLED ||
            status === YardMovementStatus.REJECTED
        );
    }
}
