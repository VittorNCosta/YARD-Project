import type { FastifyInstance } from "fastify";
import { container } from "tsyringe";

import type { EmailService } from "@/modules/auth/domain/auth/services/email-service";

export interface BuildTestAppOptions {
    /**
     * Substitui o `EmailService` registrado no container. Útil para asseverar
     * conteúdo do email enviado no fluxo de password-reset sem precisar de
     * SMTP real (que poderia, no Nodemailer, vazar credenciais via stack
     * trace — F-09).
     */
    emailService?: EmailService;
}

/**
 * Builder do app para testes E2E.
 *
 * - Sobrescreve `process.env.MONGO_URI` com a URI do memory-server (a função
 *   `startMongo()` do helper irmão já fez isso).
 * - Importa providers (binda tsyringe) ANTES de importar o `buildApp`, para
 *   que o `container.resolve()` interno saiba resolver os singletons.
 * - Permite override do EmailService via parâmetro opcional.
 *
 * O caller é responsável por chamar `app.close()` no `afterAll`.
 */
export async function buildTestApp(
    options: BuildTestAppOptions = {}
): Promise<FastifyInstance> {
    // Carrega providers (efeito colateral: registra bindings no container).
    await import("@/infra/setup/setup-providers").then((m) =>
        m.setupProviders()
    );

    if (options.emailService) {
        container.registerInstance(
            "EmailService",
            options.emailService
        );
    }

    const { buildApp } = await import("@/infra/http/app");
    const app = await buildApp();
    await app.ready();
    return app;
}
