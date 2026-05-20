import { z } from "zod";

/**
 * Schema do corpo de POST /api/vehicles.
 *
 * Regras derivadas do schema Mongoose legado:
 * - `plate`, `driverName`, `cargoType`, `status` obrigatórios.
 * - Campos opcionais aceitos mas não exigidos.
 * - `activeStatus` limitado a "Ativo" | "Inativo" (enum do domain).
 */
export const createVehicleBodySchema = z.object({
    plate: z.string().min(1),
    driverName: z.string().min(1),
    cargoType: z.string().min(1),
    status: z.string().min(1),

    color: z.string().optional(),
    driverCpf: z.string().optional(),
    vehicleType: z.string().optional(),
    weighingRequired: z.boolean().optional(),
    activeStatus: z.enum(["Ativo", "Inativo"]).optional(),
    entryDate: z.coerce.date().optional(),
    arrivalDate: z.coerce.date().optional(),
    departureDate: z.coerce.date().optional(),
    releasedBy: z.string().optional(),
    processType: z.string().optional(),
    entryWeight: z.string().optional(),
    exitWeight: z.string().optional(),
    dock: z.string().optional(),
});

export type CreateVehicleBody = z.infer<typeof createVehicleBodySchema>;
