import { z } from "zod";

/**
 * Schema da query de GET /api/reports/fleet.
 *
 * `from`/`to` opcionais — quando ausentes, o use-case considera toda a
 * base. Quando presentes, devem ser ISO 8601 e o controller os converte
 * para `Date` antes de chamar o use-case.
 *
 * `.strict()` rejeita campos extras (defesa em profundidade).
 */
export const getFleetMetricsQuerySchema = z
    .object({
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
    })
    .strict();

export type GetFleetMetricsQuery = z.infer<typeof getFleetMetricsQuerySchema>;
