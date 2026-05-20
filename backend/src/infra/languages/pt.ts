import { authPt } from "@/modules/auth/domain/auth/languages/pt";
import { userPt } from "@/modules/user/domain/user/languages/pt";
import { vehiclePt } from "@/modules/vehicle/domain/vehicle/languages/pt";

export const pt = {
    ...vehiclePt,
    ...userPt,
    ...authPt,

    "validation.failed": "Falha na validação da requisição.",
    "http.internal-error": "Erro interno do servidor.",
};
