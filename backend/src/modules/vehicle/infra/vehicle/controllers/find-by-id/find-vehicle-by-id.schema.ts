import { z } from "zod";

export const findVehicleByIdParamsSchema = z.object({
    id: z.string().min(1),
});

export type FindVehicleByIdParams = z.infer<
    typeof findVehicleByIdParamsSchema
>;
