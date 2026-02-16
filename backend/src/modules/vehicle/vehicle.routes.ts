import { Router } from "express";
import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicleStatus,
  deleteVehicle
} from "./vehicle.controller.js"; // ⚠️ note o .js

const router: Router = Router();

router.post("/", createVehicle);
router.get("/", getVehicles);
router.get("/:id", getVehicleById);
router.put("/:id/status", updateVehicleStatus);
router.delete("/:id", deleteVehicle);

export default router;
