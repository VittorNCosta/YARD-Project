import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/database.js";

const PORT = process.env.PORT || 3000;

async function start() {

  await connectDB();

  app.listen(PORT, () => {
    console.log("🔥 MongoDB conectado");
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });

}

start();
