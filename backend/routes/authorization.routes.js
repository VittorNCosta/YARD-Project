const express = require("express");
const router = express.Router();

const authorizationController = require("../controllers/authorization.controller");

router.post("/", authorizationController.createAuthorization);
router.get("/", authorizationController.getAuthorizations);
router.patch("/:id/approve", authorizationController.approveAuthorization);

module.exports = router;
