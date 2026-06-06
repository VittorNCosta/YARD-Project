import { authEs } from "@/modules/auth/domain/auth/languages/es";
import { reportsEs } from "@/modules/reports/domain/reports/languages/es";
import { userEs } from "@/modules/user/domain/user/languages/es";
import { vehicleEs } from "@/modules/vehicle/domain/vehicle/languages/es";

export const es = {
    ...vehicleEs,
    ...userEs,
    ...authEs,
    ...reportsEs,

    "validation.failed": "Error de validación de la solicitud.",
    "http.internal-error": "Error interno del servidor.",
};
