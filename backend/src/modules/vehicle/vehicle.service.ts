// src/modules/vehicle/vehicle.service.ts
import Vehicle from "./vehicle.model.js";
import type { IVehicle } from "./vehicle.model.js";

// Cria veículo
export async function createVehicle(data: Partial<IVehicle>): Promise<IVehicle> {
  return Vehicle.create(data);
}

// Lista todos veículos
export async function getVehicles(): Promise<IVehicle[]> {
  return Vehicle.find().sort({ createdAt: -1 });
}

// Busca veículo por ID
export async function getVehicleById(id: string): Promise<IVehicle | null> {
  return Vehicle.findById(id);
}

// Atualiza status do veículo
export async function updateVehicleStatus(id: string, status: string): Promise<IVehicle | null> {
  return Vehicle.findByIdAndUpdate(id, { status }, { new: true });
}

// Deleta veículo
export async function deleteVehicle(id: string): Promise<IVehicle | null> {
  return Vehicle.findByIdAndDelete(id);
}
