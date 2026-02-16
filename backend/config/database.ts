// src/config/database.ts
import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("❌ MONGO_URI não definido no .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("🔥 MongoDB conectado com sucesso!");
    console.log("📦 DB:", mongoose.connection.name);
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
}
