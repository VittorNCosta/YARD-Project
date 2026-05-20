import { z } from "zod";

export const deleteUserParamsSchema = z
    .object({
        id: z.string().min(1),
    })
    .strict();

export type DeleteUserParams = z.infer<typeof deleteUserParamsSchema>;
