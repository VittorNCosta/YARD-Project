import { z } from "zod";

export const updateVehicleStatusParamsSchema = z.object({
    id: z.string().min(1),
});

export const updateVehicleStatusBodySchema = z.object({
    status: z.string().min(1),
});

export type UpdateVehicleStatusParams = z.infer<
    typeof updateVehicleStatusParamsSchema
>;
export type UpdateVehicleStatusBody = z.infer<
    typeof updateVehicleStatusBodySchema
>;
