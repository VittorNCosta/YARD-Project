// src/modules/authorization/authorization.service.ts
import Authorization from "./authorization.model.js";
import type { IAuthorization } from "./authorization.model.js";

export async function createAuthorization(data: Partial<IAuthorization>): Promise<IAuthorization> {
  return Authorization.create(data);
}

export async function getAuthorizations(): Promise<IAuthorization[]> {
  return Authorization.find().sort({ createdAt: -1 });
}

export async function getAuthorizationById(id: string): Promise<IAuthorization | null> {
  return Authorization.findById(id);
}

export async function updateAuthorizationRoles(id: string, roles: string[]): Promise<IAuthorization | null> {
  return Authorization.findByIdAndUpdate(id, { roles }, { new: true });
}

export async function deleteAuthorization(id: string): Promise<IAuthorization | null> {
  return Authorization.findByIdAndDelete(id);
}
