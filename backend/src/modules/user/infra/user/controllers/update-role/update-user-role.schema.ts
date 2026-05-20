import { z } from "zod";

import { UserRole } from "@/modules/user/domain/user/enums/user-role";

export const updateUserRoleParamsSchema = z
    .object({
        id: z.string().min(1),
    })
    .strict();

export const updateUserRoleBodySchema = z
    .object({
        role: z.enum([UserRole.ADMIN, UserRole.USER]),
    })
    .strict();

export type UpdateUserRoleParams = z.infer<typeof updateUserRoleParamsSchema>;
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;
