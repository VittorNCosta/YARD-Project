import { z } from "zod";

export const updateUserParamsSchema = z
    .object({
        id: z.string().min(1),
    })
    .strict();

export const updateUserBodySchema = z
    .object({
        name: z.string().trim().min(1).max(120).optional(),
        email: z.email().optional(),
        password: z
            .string()
            .min(8)
            .max(128)
            .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
                message:
                    "Senha precisa ter ao menos uma letra e um número.",
            })
            .optional(),
    })
    .strict()
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
        message: "Envie pelo menos um campo para atualizar.",
    });

export type UpdateUserParams = z.infer<typeof updateUserParamsSchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
