import 'dotenv/config'; // carrega automaticamente o .env
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${env.PORT}`);
  });
}

startServer();
