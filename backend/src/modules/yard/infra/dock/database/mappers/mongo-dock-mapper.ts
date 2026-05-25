import { Dock } from "@/modules/yard/domain/dock/entities/dock";
import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";

import type { DockDocument } from "../schemas/dock.schema";

export function normalizeDockCode(code: string): string {
    return code.trim().toUpperCase();
}

export class MongoDockMapper {
    static toDomain(raw: DockDocument): Dock {
        return Dock.create({
            id: raw._id?.toString(),
            code: raw.code,
            name: raw.name,
            status: raw.status as DockStatus,
            maintenanceReason: raw.maintenanceReason,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    static toPersistency(dock: Dock): Partial<DockDocument> {
        return {
            code: dock.code,
            normalizedCode: normalizeDockCode(dock.code),
            name: dock.name,
            status: dock.status,
            maintenanceReason: dock.maintenanceReason,
        };
    }
}

