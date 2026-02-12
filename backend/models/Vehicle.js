const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    plate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    cargoType: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PATIO", "DOCA", "FINALIZADO"],
      default: "PATIO",
    },
    entryDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
