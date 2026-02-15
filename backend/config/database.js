import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error("MONGO_URI não definida no .env");
}

const client = new MongoClient(uri);

export async function connectMongo() {
  if (!client.topology?.isConnected()) {
    await client.connect();
    console.log("MongoDB conectado");
  }
  return client;
}
