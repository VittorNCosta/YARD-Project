import { z } from "zod";

export const registerBodySchema = z
    .object({
        name: z.string().trim().min(1).max(120),
        email: z.email(),
        password: z
            .string()
            .min(8)
            .max(128)
            .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
                message:
                    "Senha precisa ter ao menos uma letra e um número.",
            }),
    })
    .strict();

export type RegisterBody = z.infer<typeof registerBodySchema>;
