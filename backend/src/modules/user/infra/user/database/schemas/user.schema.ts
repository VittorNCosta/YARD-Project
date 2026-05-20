import mongoose, { Schema, type Document, type Model } from "mongoose";

import { UserRole } from "@/modules/user/domain/user/enums/user-role";

/**
 * Schema Mongoose do User.
 *
 * - `email` único + indexado (case-insensitive: armazenamos sempre em
 *   lower-case via use case, e o índice colation default já cobre).
 * - `passwordHash` `select: false` — qualquer query precisa pedir
 *   explicitamente `.select("+passwordHash")` (feito apenas em
 *   `findByEmail`, usado pelo LoginUseCase).
 * - `role` com enum + default `USER`.
 */
export interface UserDocument extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.USER,
            required: true,
        },
    },
    { timestamps: true, collection: "users" }
);

export const UserModel: Model<UserDocument> =
    (mongoose.models.User as Model<UserDocument> | undefined) ??
    mongoose.model<UserDocument>("User", userSchema);
