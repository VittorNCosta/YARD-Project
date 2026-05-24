import { YardMovementStatus } from "../enums/yard-movement-status";

const TRANSITION_MAP: Record<YardMovementStatus, readonly YardMovementStatus[]> =
    {
        [YardMovementStatus.WAITING_QUEUE]: [
            YardMovementStatus.GATE_CHECK,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.GATE_CHECK]: [
            YardMovementStatus.ENTRY_WEIGHING,
            YardMovementStatus.YARD,
            YardMovementStatus.REJECTED,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.ENTRY_WEIGHING]: [
            YardMovementStatus.YARD,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.YARD]: [
            YardMovementStatus.DOCKED,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.DOCKED]: [
            YardMovementStatus.AWAITING_RELEASE,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.AWAITING_RELEASE]: [
            YardMovementStatus.EXIT_WEIGHING,
            YardMovementStatus.RELEASED,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.EXIT_WEIGHING]: [
            YardMovementStatus.RELEASED,
            YardMovementStatus.CANCELLED,
        ],
        [YardMovementStatus.RELEASED]: [YardMovementStatus.FINISHED],
        [YardMovementStatus.FINISHED]: [],
        [YardMovementStatus.CANCELLED]: [],
        [YardMovementStatus.REJECTED]: [],
    };

export function getAllowedYardMovementTransitions(
    status: YardMovementStatus
): readonly YardMovementStatus[] {
    return TRANSITION_MAP[status];
}

export function canTransitionYardMovementStatus(
    from: YardMovementStatus,
    to: YardMovementStatus
): boolean {
    return TRANSITION_MAP[from].includes(to);
}
