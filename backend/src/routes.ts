// src/routes.ts
import { Router } from "express";
import vehicleRoutes from "./modules/vehicle/vehicle.routes.js"; // <--- note o .js

const router: Router = Router();

router.use("/vehicles", vehicleRoutes);

export default router;
