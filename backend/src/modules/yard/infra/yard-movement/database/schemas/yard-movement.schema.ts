import mongoose, { Schema, type Document, type Model } from "mongoose";

import {
    FINAL_YARD_MOVEMENT_STATUSES,
    YardMovementStatus,
} from "@/modules/yard/domain/yard-movement/enums/yard-movement-status";
import type {
    YardMovementEvent,
    YardMovementEventData,
    YardMovementEventType,
} from "@/modules/yard/domain/yard-movement/entities/yard-movement";

export interface YardMovementDocument extends Document {
    vehicleId: string;
    plateSnapshot: string;
    driverName: string;
    cargoType: string;
    status: YardMovementStatus;
    driverCpf?: string;
    processType?: string;
    weighingRequired: boolean;
    entryWeight?: number;
    exitWeight?: number;
    dock?: string;
    arrivalDate: Date;
    departureDate?: Date;
    createdBy?: string;
    releasedBy?: string;
    cancelledBy?: string;
    statusReason?: string;
    events: YardMovementEvent[];
    createdAt: Date;
    updatedAt: Date;
}

const yardMovementEventDataSchema = new Schema<YardMovementEventData>(
    {
        entryWeight: { type: Number },
        exitWeight: { type: Number },
        dock: { type: String },
        departureDate: { type: Date },
    },
    { _id: false }
);

const yardMovementEventSchema = new Schema<YardMovementEvent>(
    {
        type: {
            type: String,
            enum: ["CREATED", "STATUS_CHANGED"] satisfies YardMovementEventType[],
            required: true,
        },
        fromStatus: {
            type: String,
            enum: Object.values(YardMovementStatus),
        },
        toStatus: {
            type: String,
            enum: Object.values(YardMovementStatus),
            required: true,
        },
        statusReason: { type: String },
        createdBy: { type: String, index: true },
        createdAt: { type: Date, required: true },
        data: { type: yardMovementEventDataSchema },
    },
    { _id: false }
);

const yardMovementSchema = new Schema<YardMovementDocument>(
    {
        vehicleId: { type: String, required: true, index: true },
        plateSnapshot: { type: String, required: true },
        driverName: { type: String, required: true },
        cargoType: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(YardMovementStatus),
            required: true,
            index: true,
        },
        driverCpf: { type: String },
        processType: { type: String },
        weighingRequired: { type: Boolean, default: false },
        entryWeight: { type: Number },
        exitWeight: { type: Number },
        dock: { type: String },
        arrivalDate: { type: Date, default: Date.now },
        departureDate: { type: Date },
        createdBy: { type: String, index: true },
        releasedBy: { type: String, index: true },
        cancelledBy: { type: String, index: true },
        statusReason: { type: String },
        events: { type: [yardMovementEventSchema], default: [] },
    },
    { timestamps: true, collection: "yard_movements" }
);

yardMovementSchema.index({
    plateSnapshot: 1,
    status: 1,
});

yardMovementSchema.index(
    { plateSnapshot: 1 },
    {
        partialFilterExpression: {
            status: {
                $nin: [...FINAL_YARD_MOVEMENT_STATUSES],
            },
        },
    }
);

yardMovementSchema.index(
    { dock: 1 },
    {
        unique: true,
        name: "unique_docked_movement_by_dock",
        partialFilterExpression: {
            status: YardMovementStatus.DOCKED,
            dock: { $exists: true, $type: "string" },
        },
    }
);

export const YardMovementModel: Model<YardMovementDocument> =
    (mongoose.models.YardMovement as
        | Model<YardMovementDocument>
        | undefined) ??
    mongoose.model<YardMovementDocument>(
        "YardMovement",
        yardMovementSchema
    );
