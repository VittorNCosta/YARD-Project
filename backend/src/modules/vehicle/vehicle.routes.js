import express from "express";

import {

  createVehicle,

  getVehicles,

  getVehicleById,

  updateVehicleStatus,

  deleteVehicle

} from "./vehicle.controller.js";

const router = express.Router();

router.post("/", createVehicle);

router.get("/", getVehicles);

router.get("/:id", getVehicleById);

router.put("/:id/status", updateVehicleStatus);

router.delete("/:id", deleteVehicle);

export default router;
