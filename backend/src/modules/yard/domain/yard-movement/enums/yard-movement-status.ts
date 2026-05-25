export enum YardMovementStatus {
    WAITING_QUEUE = "WAITING_QUEUE",
    GATE_CHECK = "GATE_CHECK",
    ENTRY_WEIGHING = "ENTRY_WEIGHING",
    YARD = "YARD",
    DOCKED = "DOCKED",
    AWAITING_RELEASE = "AWAITING_RELEASE",
    EXIT_WEIGHING = "EXIT_WEIGHING",
    RELEASED = "RELEASED",
    FINISHED = "FINISHED",
    CANCELLED = "CANCELLED",
    REJECTED = "REJECTED",
}

export const FINAL_YARD_MOVEMENT_STATUSES = [
    YardMovementStatus.FINISHED,
    YardMovementStatus.CANCELLED,
    YardMovementStatus.REJECTED,
] as const;

export function isFinalYardMovementStatus(
    status: YardMovementStatus
): boolean {
    return FINAL_YARD_MOVEMENT_STATUSES.includes(
        status as (typeof FINAL_YARD_MOVEMENT_STATUSES)[number]
    );
}
