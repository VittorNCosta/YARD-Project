import { z } from "zod";

export const resetPasswordBodySchema = z
    .object({
        token: z
            .string()
            .min(10)
            .max(256)
            .regex(/^[A-Za-z0-9_-]+$/, "Token contém caracteres inválidos."),
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

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
