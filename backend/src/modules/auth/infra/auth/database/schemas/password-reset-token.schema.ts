import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

/**
 * Schema Mongoose do PasswordResetToken.
 *
 * - `expiresAt` com TTL index (`expires: 0`) → auto-purge.
 * - `tokenHash` com **índice único** → lookup O(1) via `findByTokenHash` e
 *   colisão impossível (HMAC-SHA-256 de 256 bits).
 * - Compound `{ userId, usedAt, createdAt: -1 }` cobre
 *   `revokeAllUnusedForUser` + `countUnusedCreatedAfter`.
 * - `failedAttempts` é defense-in-depth (hoje sempre 0 com lookup-by-hash).
 */
export interface PasswordResetTokenDocument extends Document {
    userId: Types.ObjectId | string;
    tokenHash: string;
    expiresAt: Date;
    usedAt?: Date | null;
    failedAttempts: number;
    requestedIp?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        usedAt: { type: Date, default: null },
        failedAttempts: { type: Number, default: 0 },
        requestedIp: { type: String, default: null },
    },
    { timestamps: true, collection: "password_reset_tokens" }
);

// Compound index para per-user queries (`revokeAllUnused`, `countUnused`).
passwordResetTokenSchema.index({ userId: 1, usedAt: 1, createdAt: -1 });

export const PasswordResetTokenModel: Model<PasswordResetTokenDocument> =
    (mongoose.models.PasswordResetToken as
        | Model<PasswordResetTokenDocument>
        | undefined) ??
    mongoose.model<PasswordResetTokenDocument>(
        "PasswordResetToken",
        passwordResetTokenSchema
    );
