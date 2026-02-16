const express = require("express");

const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicleStatus,
  deleteVehicle,
} = require("../controllers/vehicle.controller");

const router = express.Router();


router.post("/", createVehicle);

router.get("/", getVehicles);

router.get("/:id", getVehicleById);

router.patch("/:id/status", updateVehicleStatus);

router.delete("/:id", deleteVehicle);


module.exports = router;
