const express = require("express");
const cors = require("cors");

const vehicleRoutes = require("./routes/vehicle.routes");
const authorizationRoutes = require("./routes/authorization.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚛 YARD API funcionando");
});

app.use("/vehicles", vehicleRoutes);
app.use("/authorizations", authorizationRoutes);

module.exports = app;
