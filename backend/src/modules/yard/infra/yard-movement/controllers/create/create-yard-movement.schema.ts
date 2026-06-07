import { z } from "zod";

export const createYardMovementBodySchema = z.object({
    vehicleId: z.string().min(1),
    driverName: z.string().min(1),
    cargoType: z.string().min(1),
    driverCpf: z.string().optional(),
    processType: z.string().optional(),
    arrivalDate: z.coerce.date().optional(),
});

export type CreateYardMovementBody = z.infer<
    typeof createYardMovementBodySchema
>;
