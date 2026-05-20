import { z } from "zod";

/**
 * Placeholder de schema para GET /api/vehicles.
 * Não há parâmetros de query no contrato atual, mas o arquivo existe
 * para manter a estrutura padrão do STYLE_GUIDE e preparar filtros futuros.
 */
export const listVehicleQuerySchema = z.object({}).optional();
