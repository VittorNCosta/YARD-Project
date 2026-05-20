import { ZodError, type ZodType } from "zod";

/**
 * Valida um payload (body/params/query) contra um schema Zod e devolve a
 * entrada tipada. Em caso de falha, propaga o `ZodError` — o error handler
 * global em `infra/http/middlewares/error-handler.ts` é responsável por
 * traduzi-lo em resposta HTTP 400.
 */
export function zodValidationSchema<T>(
    schema: ZodType<T>,
    data: unknown
): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw result.error satisfies ZodError;
    }
    return result.data;
}
