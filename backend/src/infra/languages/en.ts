import { authEn } from "@/modules/auth/domain/auth/languages/en";
import { userEn } from "@/modules/user/domain/user/languages/en";
import { vehicleEn } from "@/modules/vehicle/domain/vehicle/languages/en";

/**
 * Dicionário i18n em inglês. Agrega todas as chaves dos módulos de domínio.
 * Chaves exclusivas de infra (HTTP, validação) vivem aqui também.
 */
export const en = {
    ...vehicleEn,
    ...userEn,
    ...authEn,

    "validation.failed": "Request validation failed.",
    "http.internal-error": "Internal server error.",
};

export type TranslationKey = keyof typeof en;
