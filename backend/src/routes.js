import express from "express";

import vehicleRoutes from "./modules/vehicle/vehicle.routes.js";

const router = express.Router();

router.use("/vehicles", vehicleRoutes);

export default router;
