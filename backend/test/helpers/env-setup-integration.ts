import "reflect-metadata";

/**
 * Setup das suítes de integração e e2e.
 *
 * Mesmas variáveis do `env-setup.ts` (necessárias por causa do Zod no
 * top-level de `@/config/env`). MONGO_URI fica como placeholder porque o
 * helper `mongo-memory.ts` substitui em runtime apontando para o
 * mongodb-memory-server.
 */
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "x".repeat(32);
process.env.JWT_REFRESH_SECRET = "y".repeat(32);
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "7d";
process.env.COOKIE_SECRET = "z".repeat(32);
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://placeholder/test";

// ─── Password reset envs (test defaults) ─────────────────────────────
process.env.RESET_TOKEN_PEPPER =
    "test-pepper-test-pepper-test-pepper-test-pepper-test-pepper-1234";
process.env.DUMMY_BCRYPT_HASH =
    "$2b$12$abcdefghijklmnopqrstuOmIscS1F3pNcsCMjlxNxehiHfsCM9aQrG";
process.env.PASSWORD_RESET_TTL_MINUTES = "30";
process.env.SMTP_FROM = "test@yardcontrol.local";
