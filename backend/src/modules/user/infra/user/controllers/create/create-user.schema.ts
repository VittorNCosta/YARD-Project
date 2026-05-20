import { z } from "zod";

import { UserRole } from "@/modules/user/domain/user/enums/user-role";

/**
 * Body de POST /api/users (admin-only).
 *
 * Senha mínima: 8 chars, ao menos 1 letra e 1 número — alinhado ao schema
 * do frontend (Login/Register).
 */
export const createUserBodySchema = z
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
        role: z.enum([UserRole.ADMIN, UserRole.USER]).optional(),
    })
    .strict();

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
