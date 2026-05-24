import { z } from "zod";

export const deleteDockParamsSchema = z.object({
    id: z.string().min(1),
});

export type DeleteDockParams = z.infer<typeof deleteDockParamsSchema>;

