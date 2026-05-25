import { z } from "zod";

export const findYardMovementByIdParamsSchema = z.object({
    id: z.string().min(1),
});

export type FindYardMovementByIdParams = z.infer<
    typeof findYardMovementByIdParamsSchema
>;
