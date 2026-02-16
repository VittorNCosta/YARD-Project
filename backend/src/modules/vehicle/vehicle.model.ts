import mongoose, { Document, Schema, Model } from "mongoose";

export interface IVehicle extends Document {
  plate: string;
  driverName: string;
  cargoType: string;
  status: string;
  entryDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    plate: { type: String, required: true },
    driverName: { type: String, required: true },
    cargoType: { type: String, required: true },
    status: { type: String, required: true },
    entryDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Vehicle: Model<IVehicle> = mongoose.model<IVehicle>("Vehicle", vehicleSchema);

export default Vehicle;
