import type { Dock } from "@/modules/yard/domain/dock/entities/dock";

export class DockPresenter {
    static toHTTP(dock: Dock): Record<string, unknown> {
        return {
            id: dock.id,
            code: dock.code,
            name: dock.name,
            status: dock.status,
            maintenanceReason: dock.maintenanceReason,
            createdAt: dock.createdAt,
            updatedAt: dock.updatedAt,
        };
    }
}

