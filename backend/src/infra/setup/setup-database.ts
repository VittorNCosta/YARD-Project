import { connectMongo } from "@/infra/database/mongo/mongo-connection";

/**
 * Inicialização do banco. Isolado em um passo próprio para facilitar testes
 * e permitir reutilização fora do entry-point HTTP (ex.: scripts one-off,
 * seeds, etc.).
 */
export async function setupDatabase(): Promise<void> {
    await connectMongo();
}
