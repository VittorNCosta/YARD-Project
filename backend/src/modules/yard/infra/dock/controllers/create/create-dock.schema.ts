import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";
import { z } from "zod";

export const createDockBodySchema = z.object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().max(120).optional(),
    status: z.enum(DockStatus).optional(),
    maintenanceReason: z.string().trim().max(500).optional(),
});

export type CreateDockBody = z.infer<typeof createDockBodySchema>;

