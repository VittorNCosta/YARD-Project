import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { describe, expect, it } from "vitest";

import { makeYardMovement } from "./make-yard-movement";

describe("Yard movement entity", () => {
    it("should be able to create a movement with default queue status", () => {
        const sut = makeYardMovement();

        expect(sut.status).toBe(YardMovementStatus.WAITING_QUEUE);
        expect(sut.weighingRequired).toBe(false);
        expect(sut.arrivalDate).toBeInstanceOf(Date);
    });

    it("should be able to move a non-weighing movement through the happy path", () => {
        const sut = makeYardMovement({ weighingRequired: false });

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.YARD);
        sut.changeStatus(YardMovementStatus.DOCKED, { dock: "Doca 1" });
        sut.changeStatus(YardMovementStatus.AWAITING_RELEASE);
        sut.changeStatus(YardMovementStatus.RELEASED, {
            releasedBy: "Maria Operadora",
        });
        sut.changeStatus(YardMovementStatus.FINISHED);

        expect(sut.status).toBe(YardMovementStatus.FINISHED);
        expect(sut.departureDate).toBeInstanceOf(Date);
        expect(sut.dock).toBeUndefined();
    });

    it("should be able to move a weighing movement through the happy path", () => {
        const sut = makeYardMovement({ weighingRequired: true });

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.ENTRY_WEIGHING);
        sut.changeStatus(YardMovementStatus.YARD, { entryWeight: 12500 });
        sut.changeStatus(YardMovementStatus.DOCKED, { dock: "Doca 2" });
        sut.changeStatus(YardMovementStatus.AWAITING_RELEASE);
        sut.changeStatus(YardMovementStatus.EXIT_WEIGHING);
        sut.changeStatus(YardMovementStatus.RELEASED, {
            exitWeight: 8400,
            releasedBy: "Carlos Operador",
        });
        sut.changeStatus(YardMovementStatus.FINISHED);

        expect(sut.status).toBe(YardMovementStatus.FINISHED);
        expect(sut.entryWeight).toBe(12500);
        expect(sut.exitWeight).toBe(8400);
        expect(sut.releasedBy).toBe("Carlos Operador");
    });

    it("should not be able to skip entry weighing when weighing is required", () => {
        const sut = makeYardMovement({ weighingRequired: true });

        sut.changeStatus(YardMovementStatus.GATE_CHECK);

        expect(() => sut.changeStatus(YardMovementStatus.YARD)).toThrow(
            "yard-movement.entry-weighing-required"
        );
    });

    it("should not be able to enter yard from entry weighing without entry weight", () => {
        const sut = makeYardMovement({ weighingRequired: true });

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.ENTRY_WEIGHING);

        expect(() => sut.changeStatus(YardMovementStatus.YARD)).toThrow(
            "yard-movement.entry-weight-required"
        );
    });

    it("should not be able to dock without dock code", () => {
        const sut = makeYardMovement();

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.YARD);

        expect(() => sut.changeStatus(YardMovementStatus.DOCKED)).toThrow(
            "yard-movement.dock-required"
        );
    });

    it("should not be able to release without responsible user", () => {
        const sut = makeYardMovement();

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.YARD);
        sut.changeStatus(YardMovementStatus.DOCKED, { dock: "Doca 1" });
        sut.changeStatus(YardMovementStatus.AWAITING_RELEASE);

        expect(() => sut.changeStatus(YardMovementStatus.RELEASED)).toThrow(
            "yard-movement.released-by-required"
        );
    });

    it("should not be able to release weighing movement without exit weight", () => {
        const sut = makeYardMovement({ weighingRequired: true });

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.ENTRY_WEIGHING);
        sut.changeStatus(YardMovementStatus.YARD, { entryWeight: 12500 });
        sut.changeStatus(YardMovementStatus.DOCKED, { dock: "Doca 1" });
        sut.changeStatus(YardMovementStatus.AWAITING_RELEASE);
        sut.changeStatus(YardMovementStatus.EXIT_WEIGHING);

        expect(() =>
            sut.changeStatus(YardMovementStatus.RELEASED, {
                releasedBy: "Ana Operadora",
            })
        ).toThrow("yard-movement.exit-weight-required");
    });

    it("should be able to cancel with status reason", () => {
        const sut = makeYardMovement();

        sut.changeStatus(YardMovementStatus.CANCELLED, {
            actorId: "user-1",
            statusReason: "Motorista solicitou cancelamento",
        });

        expect(sut.status).toBe(YardMovementStatus.CANCELLED);
        expect(sut.cancelledBy).toBe("user-1");
        expect(sut.statusReason).toBe("Motorista solicitou cancelamento");
    });

    it("should be able to reject at gate check with status reason", () => {
        const sut = makeYardMovement();

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.REJECTED, {
            statusReason: "Documento do motorista invalido",
        });

        expect(sut.status).toBe(YardMovementStatus.REJECTED);
        expect(sut.statusReason).toBe("Documento do motorista invalido");
    });

    it("should not be able to cancel without status reason", () => {
        const sut = makeYardMovement();

        expect(() => sut.changeStatus(YardMovementStatus.CANCELLED)).toThrow(
            "yard-movement.status-reason-required"
        );
    });

    it("should not be able to reject without status reason", () => {
        const sut = makeYardMovement();

        sut.changeStatus(YardMovementStatus.GATE_CHECK);

        expect(() => sut.changeStatus(YardMovementStatus.REJECTED)).toThrow(
            "yard-movement.status-reason-required"
        );
    });

    it("should not be able to transition after final status", () => {
        const sut = makeYardMovement();

        sut.changeStatus(YardMovementStatus.GATE_CHECK);
        sut.changeStatus(YardMovementStatus.YARD);
        sut.changeStatus(YardMovementStatus.DOCKED, { dock: "Doca 1" });
        sut.changeStatus(YardMovementStatus.AWAITING_RELEASE);
        sut.changeStatus(YardMovementStatus.RELEASED, {
            releasedBy: "Maria Operadora",
        });
        sut.changeStatus(YardMovementStatus.FINISHED);

        expect(() => sut.changeStatus(YardMovementStatus.CANCELLED)).toThrow(
            "yard-movement.invalid-status-transition"
        );
    });
});
