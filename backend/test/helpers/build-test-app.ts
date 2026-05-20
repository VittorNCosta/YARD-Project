import type { FastifyInstance } from "fastify";

/**
 * Builder do app para testes E2E.
 *
 * - Sobrescreve `process.env.MONGO_URI` com a URI do memory-server (a função
 *   `startMongo()` do helper irmão já fez isso).
 * - Importa providers (binda tsyringe) ANTES de importar o `buildApp`, para
 *   que o `container.resolve()` interno saiba resolver os singletons.
 * - Conecta o mongoose à URI configurada (caso `startMongo` ainda não tenha
 *   conectado).
 *
 * O caller é responsável por chamar `app.close()` no `afterAll`.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
    // Carrega providers (efeito colateral: registra bindings no container).
    await import("@/infra/setup/setup-providers").then((m) =>
        m.setupProviders()
    );

    const { buildApp } = await import("@/infra/http/app");
    const app = await buildApp();
    await app.ready();
    return app;
}
