const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicle.controller");

router.post("/", vehicleController.createVehicle);
router.get("/", vehicleController.getVehicles);
router.patch("/:id/status", vehicleController.updateVehicleStatus);
router.delete("/:id", vehicleController.deleteVehicle);

module.exports = router;
