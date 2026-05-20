import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

/**
 * Lifecycle helper para `mongodb-memory-server`.
 *
 * - `startMongo()` — sobe o memory-server, ajusta `MONGO_URI`, conecta o
 *   `mongoose` e devolve a URI (caso a suíte queira passar adiante).
 * - `stopMongo()` — desconecta `mongoose` e para o memory-server.
 * - `cleanMongo()` — drop database; usado em `beforeEach` para isolamento
 *   entre testes.
 *
 * Mantemos a referência do `MongoMemoryServer` em escopo de módulo —
 * cada arquivo de spec inicia/para o seu próprio servidor (mais lento mas
 * mais isolado), ou pode reusar entre testes via `beforeAll`/`afterAll`.
 */
let server: MongoMemoryServer | undefined;

export async function startMongo(): Promise<string> {
    if (server) {
        return server.getUri();
    }

    server = await MongoMemoryServer.create();
    const uri = server.getUri();
    process.env.MONGO_URI = uri;

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }

    return uri;
}

export async function stopMongo(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (server) {
        await server.stop();
        server = undefined;
    }
}

export async function cleanMongo(): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    const db = mongoose.connection.db;
    if (!db) return;
    const collections = await db.collections();
    // dropDatabase é mais agressivo, mas remove TTL indexes que podemos querer
    // re-criar deterministicamente — usamos delete em todas as collections.
    // Para o spec do TTL index, ele precisa do índice, então usamos drop +
    // re-init via `SessionModel.init()` quando necessário.
    await Promise.all(
        collections.map((c) => c.deleteMany({}).then(() => undefined))
    );
}

export function getMongoUri(): string {
    if (!server) throw new Error("mongo memory server not started");
    return server.getUri();
}
