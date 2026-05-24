import { UseCaseError } from "@/core/errors/use-case-error";
import { DeleteDockUseCase } from "@/modules/yard/application/dock/use-cases/delete/delete-dock-use-case";
import { UpdateDockUseCase } from "@/modules/yard/application/dock/use-cases/update/update-dock-use-case";
import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";
import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { beforeEach, describe, expect, it } from "vitest";

import { makeDock } from "@test/modules/yard/domain/dock/entities/make-dock";
import { makeYardMovement } from "@test/modules/yard/domain/yard-movement/entities/make-yard-movement";
import { InMemoryDockRepository } from "@test/modules/yard/infra/dock/repositories/in-memory-dock-repository";
import { InMemoryYardMovementRepository } from "@test/modules/yard/infra/yard-movement/repositories/in-memory-yard-movement-repository";

let dockRepository: InMemoryDockRepository;
let yardMovementRepository: InMemoryYardMovementRepository;
let updateDockUseCase: UpdateDockUseCase;
let deleteDockUseCase: DeleteDockUseCase;

describe("Dock use cases", () => {
    beforeEach(() => {
        dockRepository = new InMemoryDockRepository();
        yardMovementRepository = new InMemoryYardMovementRepository();
        updateDockUseCase = new UpdateDockUseCase(
            dockRepository,
            yardMovementRepository
        );
        deleteDockUseCase = new DeleteDockUseCase(
            dockRepository,
            yardMovementRepository
        );
    });

    it("should be able to put an available dock under maintenance", async () => {
        const dock = await dockRepository.create(makeDock());

        const result = await updateDockUseCase.execute({
            id: dock.id!,
            status: DockStatus.MAINTENANCE,
            maintenanceReason: "Preventiva eletrica",
        });

        expect(result.status).toBe(DockStatus.MAINTENANCE);
        expect(result.maintenanceReason).toBe("Preventiva eletrica");
    });

    it("should not be able to block an occupied dock", async () => {
        const dock = await dockRepository.create(makeDock({ code: "Doca 1" }));
        await yardMovementRepository.create(
            makeYardMovement({
                status: YardMovementStatus.DOCKED,
                dock: "Doca 1",
            })
        );

        await expect(
            updateDockUseCase.execute({
                id: dock.id!,
                status: DockStatus.MAINTENANCE,
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should not be able to change an occupied dock code", async () => {
        const dock = await dockRepository.create(makeDock({ code: "Doca 1" }));
        await yardMovementRepository.create(
            makeYardMovement({
                status: YardMovementStatus.DOCKED,
                dock: "Doca 1",
            })
        );

        await expect(
            updateDockUseCase.execute({
                id: dock.id!,
                code: "Doca 10",
            })
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it("should not be able to delete an occupied dock", async () => {
        const dock = await dockRepository.create(makeDock({ code: "Doca 1" }));
        await yardMovementRepository.create(
            makeYardMovement({
                status: YardMovementStatus.DOCKED,
                dock: "Doca 1",
            })
        );

        await expect(
            deleteDockUseCase.execute({ id: dock.id! })
        ).rejects.toBeInstanceOf(UseCaseError);
    });
});

