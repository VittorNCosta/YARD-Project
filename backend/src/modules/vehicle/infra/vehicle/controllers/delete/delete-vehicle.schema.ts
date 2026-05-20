import { z } from "zod";

export const deleteVehicleParamsSchema = z.object({
    id: z.string().min(1),
});

export type DeleteVehicleParams = z.infer<typeof deleteVehicleParamsSchema>;
