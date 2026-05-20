import "reflect-metadata";

/**
 * Setup compartilhado para todas as suítes de teste (unit / integration / e2e).
 *
 * Define os ENV vars necessários ANTES de qualquer import que toque
 * `@/config/env` — esse módulo valida via Zod no top-level e lança se faltar
 * algo. Configurar aqui significa que o `vitest.config.ts` precisa apontar
 * `setupFiles` para este arquivo.
 *
 * Para os testes unit não precisamos de Mongo real (nem JWT real), mas o
 * env validator falha se as variáveis estiverem ausentes — então preenchemos
 * placeholders. Layers acima (integration/e2e) sobrescrevem MONGO_URI.
 */
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "x".repeat(32);
process.env.JWT_REFRESH_SECRET = "y".repeat(32);
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "7d";
process.env.COOKIE_SECRET = "z".repeat(32);
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://placeholder/test";
