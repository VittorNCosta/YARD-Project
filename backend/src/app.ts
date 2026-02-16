import express from "express";
import type { Application } from "express";
import cors from "cors";

import routes from "./routes.js";                 // <--- note o .js
// app.ts (TS)
import errorMiddleware from "./middlewares/error.middleware.js"; // ⚠️ note o .js

const app: Application = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.use(errorMiddleware);

export default app;
