import "dotenv/config";
import { connectMongo } from "./config/mongo.js";

async function start() {
  await connectMongo();
  console.log("Aplicação iniciada");
}

start();
