import { z } from "zod";

export const updateVehicleParamsSchema = z.object({
    id: z.string().min(1),
});

/**
 * Schema de PUT /api/vehicles/:id — atualização parcial.
 * Todos os campos são opcionais; pelo menos um precisa ser fornecido
 * (garantido via `.refine`).
 */
export const updateVehicleBodySchema = z
    .object({
        plate: z.string().min(1).optional(),
        driverName: z.string().min(1).optional(),
        cargoType: z.string().min(1).optional(),
        status: z.string().min(1).optional(),

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
    })
    .refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: "Envie pelo menos um campo para atualizar." }
    );

export type UpdateVehicleParams = z.infer<typeof updateVehicleParamsSchema>;
export type UpdateVehicleBody = z.infer<typeof updateVehicleBodySchema>;
