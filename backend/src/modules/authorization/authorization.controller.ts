// src/modules/authorization/authorization.controller.ts
import type { RequestHandler } from "express";
import * as authorizationService from "./authorization.service.js";

/** Garantir string para id */
function assertString(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`${name} deve ser uma string`);
  return value;
}

/** Garantir array de strings para roles */
function assertStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new Error(`${name} deve ser um array de strings`);
  }
  return value;
}

export const createAuthorization: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body;
    const authorization = await authorizationService.createAuthorization(data);
    res.status(201).json({ success: true, data: authorization });
  } catch (error) {
    next(error);
  }
};

export const getAuthorizations: RequestHandler = async (req, res, next) => {
  try {
    const authorizations = await authorizationService.getAuthorizations();
    res.json({ success: true, count: authorizations.length, data: authorizations });
  } catch (error) {
    next(error);
  }
};

export const getAuthorizationById: RequestHandler = async (req, res, next) => {
  try {
    const id = assertString(req.params.id, "id");
    const authorization = await authorizationService.getAuthorizationById(id);
    res.json({ success: true, data: authorization });
  } catch (error) {
    next(error);
  }
};

export const updateAuthorizationRoles: RequestHandler = async (req, res, next) => {
  try {
    const id = assertString(req.params.id, "id");
    const roles = assertStringArray(req.body.roles, "roles");
    const authorization = await authorizationService.updateAuthorizationRoles(id, roles);
    res.json({ success: true, data: authorization });
  } catch (error) {
    next(error);
  }
};

export const deleteAuthorization: RequestHandler = async (req, res, next) => {
  try {
    const id = assertString(req.params.id, "id");
    await authorizationService.deleteAuthorization(id);
    res.json({ success: true, message: "Authorization deleted successfully" });
  } catch (error) {
    next(error);
  }
};
