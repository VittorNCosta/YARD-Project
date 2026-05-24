import mongoose, { Schema, type Document, type Model } from "mongoose";

import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";

export interface DockDocument extends Document {
    code: string;
    normalizedCode: string;
    name?: string;
    status: DockStatus;
    maintenanceReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const dockSchema = new Schema<DockDocument>(
    {
        code: { type: String, required: true },
        normalizedCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: { type: String },
        status: {
            type: String,
            enum: Object.values(DockStatus),
            default: DockStatus.ACTIVE,
            index: true,
        },
        maintenanceReason: { type: String },
    },
    { timestamps: true, collection: "docks" }
);

export const DockModel: Model<DockDocument> =
    (mongoose.models.Dock as Model<DockDocument> | undefined) ??
    mongoose.model<DockDocument>("Dock", dockSchema);

