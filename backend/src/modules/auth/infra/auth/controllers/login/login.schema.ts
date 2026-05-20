import { z } from "zod";

export const loginBodySchema = z
    .object({
        email: z.email(),
        password: z.string().min(1).max(128),
    })
    .strict();

export type LoginBody = z.infer<typeof loginBodySchema>;
