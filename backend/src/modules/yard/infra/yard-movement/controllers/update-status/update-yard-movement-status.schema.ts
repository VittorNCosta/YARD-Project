import { YardMovementStatus } from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import { z } from "zod";

export const updateYardMovementStatusParamsSchema = z.object({
    id: z.string().min(1),
});

export const updateYardMovementStatusBodySchema = z
    .object({
        status: z.enum(YardMovementStatus),
        entryWeight: z.coerce.number().positive().optional(),
        exitWeight: z.coerce.number().positive().optional(),
        dock: z.string().trim().min(1).optional(),
        statusReason: z.string().trim().min(3).max(500).optional(),
        departureDate: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
        if (
            (data.status === YardMovementStatus.CANCELLED ||
                data.status === YardMovementStatus.REJECTED) &&
            !data.statusReason
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["statusReason"],
                message:
                    "statusReason is required when cancelling or rejecting a movement",
            });
        }
    });

export type UpdateYardMovementStatusParams = z.infer<
    typeof updateYardMovementStatusParamsSchema
>;
export type UpdateYardMovementStatusBody = z.infer<
    typeof updateYardMovementStatusBodySchema
>;
