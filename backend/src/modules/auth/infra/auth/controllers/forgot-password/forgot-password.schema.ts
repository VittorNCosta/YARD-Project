import { z } from "zod";

export const forgotPasswordBodySchema = z
    .object({
        email: z.email().max(254),
    })
    .strict();

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
