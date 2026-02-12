const mongoose = require("mongoose");

const authorizationSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    authorizedBy: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["ENTRADA_DOCA", "SAIDA_PATIO"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDENTE", "APROVADA", "RECUSADA"],
      default: "PENDENTE",
    },
    authorizedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Authorization", authorizationSchema);
