import { z } from "zod";

export const findDockByIdParamsSchema = z.object({
    id: z.string().min(1),
});

export type FindDockByIdParams = z.infer<typeof findDockByIdParamsSchema>;

