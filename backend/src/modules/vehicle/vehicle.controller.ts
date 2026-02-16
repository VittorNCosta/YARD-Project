import type { RequestHandler } from "express";
import * as vehicleService from "./vehicle.service.js";

/**
 * Função utilitária para garantir que um valor é string
 * Caso contrário, lança erro para o TypeScript e runtime
 */
function assertString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`${name} deve ser uma string`);
  }
  return value;
}

/** Cria um veículo */
export const createVehicle: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body;
    const vehicle = await vehicleService.createVehicle(data);
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
};

/** Lista todos os veículos */
export const getVehicles: RequestHandler = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.getVehicles();
    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    next(error);
  }
};

/** Busca veículo por ID */
export const getVehicleById: RequestHandler = async (req, res, next) => {
  try {
    const id = assertString(req.params.id, "id");
    const vehicle = await vehicleService.getVehicleById(id);
    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
};

/** Atualiza status do veículo */
export const updateVehicleStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = assertString(req.params.id, "id");
    const status = assertString(req.body.status, "status");
    const vehicle = await vehicleService.updateVehicleStatus(id, status);
    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
};

/** Deleta veículo */
export const deleteVehicle: RequestHandler = async (req, res, next) => {
  try {
    const id = assertString(req.params.id, "id");
    await vehicleService.deleteVehicle(id);
    res.json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    next(error);
  }
};
