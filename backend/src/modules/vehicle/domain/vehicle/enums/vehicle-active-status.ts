/**
 * Status cadastral do veículo. Valores em pt-BR por compatibilidade com
 * o schema Mongoose legado (`enum: ["Ativo", "Inativo"]`) e com o frontend
 * (src/hooks/useVehicles.ts mapeia direto pra esses literais).
 */
export enum VehicleActiveStatus {
    ACTIVE = "Ativo",
    INACTIVE = "Inativo",
}
