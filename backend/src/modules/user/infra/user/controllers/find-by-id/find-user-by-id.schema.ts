import { z } from "zod";

export const findUserByIdParamsSchema = z
    .object({
        id: z.string().min(1),
    })
    .strict();

export type FindUserByIdParams = z.infer<typeof findUserByIdParamsSchema>;
