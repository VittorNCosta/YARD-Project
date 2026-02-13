import "dotenv/config";
import { connectMongo } from "./config/auth.js";

async function start() {
  await connectMongo();
  console.log("Aplicação pronta");
}

start();
