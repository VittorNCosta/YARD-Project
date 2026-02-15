import express from "express";
import truckRoutes from "./routes/truckRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/trucks", truckRoutes);

export default app;
