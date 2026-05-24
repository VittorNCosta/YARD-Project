import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";
import { z } from "zod";

export const updateDockParamsSchema = z.object({
    id: z.string().min(1),
});

export const updateDockBodySchema = z
    .object({
        code: z.string().trim().min(1).max(40).optional(),
        name: z.string().trim().max(120).optional(),
        status: z.enum(DockStatus).optional(),
        maintenanceReason: z.string().trim().max(500).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export type UpdateDockParams = z.infer<typeof updateDockParamsSchema>;
export type UpdateDockBody = z.infer<typeof updateDockBodySchema>;

