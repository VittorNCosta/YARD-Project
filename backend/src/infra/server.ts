import "reflect-metadata";

import { env } from "@/config/env";
import { buildApp } from "@/infra/http/app";
import { setupApplication } from "@/infra/setup";

/**
 * Entry point HTTP. Sequência:
 *   1. reflect-metadata (decorators tsyringe funcionarem).
 *   2. env validado via Zod (falha cedo se faltar variável).
 *   3. setupApplication: i18n → providers → database.
 *   4. build da instância Fastify e `listen`.
 *
 * Porta e host vêm de `env`.
 */
async function start(): Promise<void> {
    try {
        await setupApplication();

        const app = await buildApp();

        await app.listen({ port: env.PORT, host: "0.0.0.0" });

        console.log(
            `[server] rodando em http://localhost:${env.PORT} (env=${env.NODE_ENV})`
        );
    } catch (error) {
        console.error("[server] falha ao iniciar:", error);
        process.exit(1);
    }
}

void start();
