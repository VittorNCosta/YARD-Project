import "dotenv/config";
import { z } from "zod";

/**
 * Validação e tipagem das variáveis de ambiente do backend.
 *
 * Chamado uma única vez no boot (`infra/server.ts`) — se qualquer variável
 * obrigatória estiver ausente, o processo falha imediatamente com mensagem
 * clara, em vez de deixar `undefined` vazar para o runtime.
 */
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGO_URI: z.string().min(1, "MONGO_URI é obrigatório"),

    // Segredos JWT (HS256) — exigir 32+ chars para reduzir risco de brute force.
    JWT_ACCESS_SECRET: z
        .string()
        .min(32, "JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres"),
    JWT_REFRESH_SECRET: z
        .string()
        .min(32, "JWT_REFRESH_SECRET precisa ter pelo menos 32 caracteres"),

    // TTLs aceitam o formato do `jsonwebtoken` (ex.: "15m", "7d").
    JWT_ACCESS_TTL: z.string().min(1).default("15m"),
    JWT_REFRESH_TTL: z.string().min(1).default("7d"),

    // Segredo dos cookies assinados (`@fastify/cookie`).
    COOKIE_SECRET: z
        .string()
        .min(32, "COOKIE_SECRET precisa ter pelo menos 32 caracteres"),

    // Origem do frontend autorizada no CORS (sem `*` por segurança).
    FRONTEND_URL: z.url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error(
        "[env] variáveis de ambiente inválidas:",
        parsed.error.issues
    );
    throw new Error("Configuração de ambiente inválida. Verifique o .env.");
}

export const env = parsed.data;
export type Env = typeof env;
