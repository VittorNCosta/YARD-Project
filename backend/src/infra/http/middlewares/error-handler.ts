import { env } from "@/config/env";
import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

/**
 * Error handler global do Fastify.
 *
 * Contrato de resposta: preserva o envelope legado do Express
 * (`{ success: false, message }`) para que o frontend existente
 * (src/services/api.ts + src/hooks/useVehicles.ts) continue parseando erros
 * sem alterações.
 *
 * - `UseCaseError`   → statusCode da própria classe, `message = key` (i18n
 *                      será resolvido pelo cliente por enquanto).
 * - `ZodError`       → 400 + lista de issues em `errors`.
 * - Fastify/outros   → statusCode do Fastify ou 500 default.
 *
 * Em produção (`NODE_ENV === "production"`), 5xx **não** retorna detalhes
 * internos: a mensagem fica genérica e o stack/error.message original só
 * aparece nos logs do servidor. Em dev mantemos a mensagem detalhada
 * pra facilitar troubleshooting.
 */
export function errorHandler(
    error: FastifyError | Error,
    _request: FastifyRequest,
    reply: FastifyReply
): void {
    if (error instanceof UseCaseError) {
        reply.status(error.statusCode).send({
            success: false,
            message: error.key,
        });
        return;
    }

    if (error instanceof ZodError) {
        reply.status(HttpStatusCode.BAD_REQUEST).send({
            success: false,
            message: "validation.failed",
            errors: error.issues.map((issue) => ({
                path: issue.path.join("."),
                code: issue.code,
                message: issue.message,
            })),
        });
        return;
    }

    const fastifyError = error as FastifyError;
    const statusCode =
        fastifyError.statusCode ?? HttpStatusCode.INTERNAL_SERVER_ERROR;

    // Sempre logamos detalhe completo no servidor.
    console.error("[error-handler]", error);

    const isServerError = statusCode >= 500;
    const message =
        isServerError && env.NODE_ENV === "production"
            ? "http.internal-error"
            : error.message || "http.internal-error";

    reply.status(statusCode).send({
        success: false,
        message,
    });
}
