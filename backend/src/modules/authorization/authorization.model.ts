// src/modules/authorization/authorization.model.ts
import mongoose, { Schema, Document, model } from "mongoose";

export interface IAuthorization extends Document {
  userId: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const authorizationSchema = new Schema<IAuthorization>(
  {
    userId: { type: String, required: true, unique: true },
    roles: { type: [String], required: true, default: [] },
  },
  { timestamps: true }
);

const Authorization = model<IAuthorization>("Authorization", authorizationSchema);

export default Authorization;
