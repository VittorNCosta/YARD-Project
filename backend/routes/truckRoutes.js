import express from "express";
import { createTruck, getTrucks } from "../controllers/truckController.js";

const router = express.Router();

router.post("/", createTruck);

router.get("/", getTrucks);

export default router;
