import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

/**
 * Schema Mongoose da Session (refresh tokens persistidos).
 *
 * - `expiresAt` tem TTL index (`expires: 0`) — o Mongo apaga o documento
 *   automaticamente quando expira. Isso evita acúmulo de tokens revogados.
 * - `userId` indexado para acelerar `revokeAllForUser`.
 * - `hashedRefresh` é o bcrypt do refresh JWT — nunca o token cru.
 */
export interface SessionDocument extends Document {
    userId: Types.ObjectId | string;
    hashedRefresh: string;
    expiresAt: Date;
    revokedAt?: Date | null;
    userAgent?: string | null;
    ip?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        hashedRefresh: { type: String, required: true },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        revokedAt: { type: Date, default: null },
        userAgent: { type: String, default: null },
        ip: { type: String, default: null },
    },
    { timestamps: true, collection: "sessions" }
);

export const SessionModel: Model<SessionDocument> =
    (mongoose.models.Session as Model<SessionDocument> | undefined) ??
    mongoose.model<SessionDocument>("Session", sessionSchema);
