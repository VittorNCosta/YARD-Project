// src/modules/authorization/authorization.routes.ts
import { Router } from "express";
import {
  createAuthorization,
  getAuthorizations,
  getAuthorizationById,
  updateAuthorizationRoles,
  deleteAuthorization
} from "./authorization.controller.js";

const router: Router = Router();

router.post("/", createAuthorization);
router.get("/", getAuthorizations);
router.get("/:id", getAuthorizationById);
router.put("/:id/roles", updateAuthorizationRoles);
router.delete("/:id", deleteAuthorization);

export default router;
