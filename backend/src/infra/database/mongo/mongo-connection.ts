import mongoose from "mongoose";

/**
 * Conecta ao MongoDB via Mongoose usando a URI de ambiente (`MONGO_URI`).
 *
 * Idempotente: se a conexão já estiver ativa, retorna sem reabrir.
 * Feito como função (não classe) para manter o entry-point minimalista.
 * O Mongoose já mantém um pool de conexões interno — não criamos singleton
 * próprio.
 */
export async function connectMongo(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI não definido no .env");
    }

    await mongoose.connect(mongoUri);
    console.log(
        `[mongo] conectado com sucesso — db=${mongoose.connection.name}`
    );
}

export async function disconnectMongo(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
}
