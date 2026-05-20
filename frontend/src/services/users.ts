// src/services/users.ts
// CRUD admin para o recurso /api/users.

import { apiRequest } from "./api";
import type { User, UserRole } from "./auth";

export interface ListUsersParams {
  page?: number;
  perPage?: number;
  q?: string;
}

export interface ListUsersResult {
  items: User[];
  total: number;
  page: number;
  perPage: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

interface UserEnvelope {
  user: User;
}

function buildQuery(params: ListUsersParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.perPage !== undefined) search.set("perPage", String(params.perPage));
  if (params.q !== undefined && params.q !== "") search.set("q", params.q);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  return apiRequest<ListUsersResult>(`/users${buildQuery(params)}`);
}

export async function getUser(id: string): Promise<User> {
  const data = await apiRequest<UserEnvelope>(`/users/${encodeURIComponent(id)}`);
  return data.user;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const data = await apiRequest<UserEnvelope>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const data = await apiRequest<UserEnvelope>(`/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function updateUserRole(id: string, role: UserRole): Promise<User> {
  const data = await apiRequest<UserEnvelope>(
    `/users/${encodeURIComponent(id)}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }
  );
  return data.user;
}

export async function deleteUser(id: string): Promise<void> {
  await apiRequest<unknown>(`/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
