import mongoose, { Schema, type Document, type Model } from "mongoose";

/**
 * Schema Mongoose do Vehicle. Replicado 1:1 do modelo legado em
 * `backend/src/modules/vehicle/vehicle.model.ts` para garantir que o Fastify
 * leia/escreva no MESMO collection (`vehicles`) que o Express — sem migrar
 * nenhum documento.
 *
 * Importante: definimos `overwriteModels: false` por segurança, e usamos
 * `mongoose.models.Vehicle ?? mongoose.model(...)` para não registrar o
 * model duas vezes caso o Express também carregue este arquivo no futuro.
 */
export interface VehicleDocument extends Document {
    plate: string;
    driverName: string;
    cargoType: string;
    status: string;
    entryDate?: Date;
    color?: string;
    driverCpf?: string;
    vehicleType?: string;
    weighingRequired?: boolean;
    activeStatus?: "Ativo" | "Inativo";
    arrivalDate?: Date;
    departureDate?: Date;
    releasedBy?: string;
    processType?: string;
    entryWeight?: string;
    exitWeight?: string;
    dock?: string;
    createdAt: Date;
    updatedAt: Date;
}

const vehicleSchema = new Schema<VehicleDocument>(
    {
        plate: { type: String, required: true },
        driverName: { type: String, required: true },
        cargoType: { type: String, required: true },
        status: { type: String, required: true },
        entryDate: { type: Date, default: Date.now },

        color: { type: String },
        driverCpf: { type: String },
        vehicleType: { type: String },
        weighingRequired: { type: Boolean, default: false },
        activeStatus: {
            type: String,
            enum: ["Ativo", "Inativo"],
            default: "Ativo",
        },
        arrivalDate: { type: Date },
        departureDate: { type: Date },
        releasedBy: { type: String },
        processType: { type: String },
        entryWeight: { type: String },
        exitWeight: { type: String },
        dock: { type: String },
    },
    { timestamps: true, collection: "vehicles" }
);

export const VehicleModel: Model<VehicleDocument> =
    (mongoose.models.Vehicle as Model<VehicleDocument> | undefined) ??
    mongoose.model<VehicleDocument>("Vehicle", vehicleSchema);
