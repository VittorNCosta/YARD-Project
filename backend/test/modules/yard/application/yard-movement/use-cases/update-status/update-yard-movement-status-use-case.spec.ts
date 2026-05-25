import { UseCaseError } from "@/core/errors/use-case-error";
import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { UpdateYardMovementStatusUseCase } from "@/modules/yard/application/yard-movement/use-cases/update-status/update-yard-movement-status-use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { makeDock } from "@test/modules/yard/domain/dock/entities/make-dock";
import { makeYardMovement } from "@test/modules/yard/domain/yard-movement/entities/make-yard-movement";
import { InMemoryDockRepository } from "@test/modules/yard/infra/dock/repositories/in-memory-dock-repository";
import { InMemoryYardMovementRepository } from "@test/modules/yard/infra/yard-movement/repositories/in-memory-yard-movement-repository";

let repository: InMemoryYardMovementRepository;
let dockRepository: InMemoryDockRepository;
let sut: UpdateYardMovementStatusUseCase;

describe("Update yard movement status use case", () => {
    beforeEach(() => {
        repository = new InMemoryYardMovementRepository();
        dockRepository = new InMemoryDockRepository();
        sut = new UpdateYardMovementStatusUseCase(repository, dockRepository);
    });

    it("should be able to update yard movement status", async () => {
        const yardMovement = await repository.create(makeYardMovement());

        const result = await sut.execute({
            id: yardMovement.id!,
            status: YardMovementStatus.GATE_CHECK,
            actorId: "user-1",
        });

        expect(result.status).toBe(YardMovementStatus.GATE_CHECK);
    });

    it("should be able to pass transition data to domain rules", async () => {
        const yardMovement = await repository.create(
            makeYardMovement({
                weighingRequired: true,
                status: YardMovementStatus.ENTRY_WEIGHING,
            })
        );

        const result = await sut.execute({
            id: yardMovement.id!,
            status: YardMovementStatus.YARD,
            entryWeight: 12500,
            actorId: "user-1",
        });

        expect(result.status).toBe(YardMovementStatus.YARD);
        expect(result.entryWeight).toBe(12500);
    });

    it("should throw UseCaseError when transition violates domain rule", async () => {
        const yardMovement = await repository.create(
            makeYardMovement({
                weighingRequired: true,
                status: YardMovementStatus.ENTRY_WEIGHING,
            })
        );

        await expect(
            sut.execute({
                id: yardMovement.id!,
                status: YardMovementStatus.YARD,
                actorId: "user-1",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should not be able to dock when dock is already occupied", async () => {
        await dockRepository.create(makeDock({ code: "Doca 1" }));
        await repository.create(
            makeYardMovement({
                status: YardMovementStatus.DOCKED,
                dock: "Doca 1",
            })
        );
        const yardMovement = await repository.create(
            makeYardMovement({
                status: YardMovementStatus.YARD,
                dock: undefined,
            })
        );

        await expect(
            sut.execute({
                id: yardMovement.id!,
                status: YardMovementStatus.DOCKED,
                dock: "Doca 1",
                actorId: "user-1",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should require status reason when cancelling a yard movement", async () => {
        const yardMovement = await repository.create(makeYardMovement());

        await expect(
            sut.execute({
                id: yardMovement.id!,
                status: YardMovementStatus.CANCELLED,
                actorId: "user-1",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should store status reason when cancelling a yard movement", async () => {
        const yardMovement = await repository.create(makeYardMovement());

        const result = await sut.execute({
            id: yardMovement.id!,
            status: YardMovementStatus.CANCELLED,
            statusReason: "Carga remanejada para outro veiculo",
            actorId: "user-1",
        });

        expect(result.status).toBe(YardMovementStatus.CANCELLED);
        expect(result.cancelledBy).toBe("user-1");
        expect(result.statusReason).toBe(
            "Carga remanejada para outro veiculo"
        );
    });

    it("should throw UseCaseError when yard movement does not exist", async () => {
        await expect(
            sut.execute({
                id: "missing",
                status: YardMovementStatus.GATE_CHECK,
                actorId: "user-1",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });
});
