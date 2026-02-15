import mongoose from "mongoose";

const truckSchema = new mongoose.Schema(
  {
    plate: {
      type: String,
      required: true,
      unique: true
    },
    driverName: {
      type: String,
      required: true
    },
    driverPhone: {
      type: String
    },
    transporter: {
      type: String
    },
    status: {
      type: String,
      default: "waiting"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Truck", truckSchema);
