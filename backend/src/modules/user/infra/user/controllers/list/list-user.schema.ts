import { z } from "zod";

export const listUserQuerySchema = z
    .object({
        page: z.coerce.number().int().positive().optional(),
        perPage: z.coerce.number().int().positive().max(100).optional(),
        q: z.string().trim().min(1).max(120).optional(),
    })
    .strict();

export type ListUserQuery = z.infer<typeof listUserQuerySchema>;
