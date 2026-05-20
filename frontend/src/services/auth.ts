// src/services/auth.ts
// Cliente para os endpoints /api/auth/*. Cookies HttpOnly são gerenciados
// 100% pelo backend (Set-Cookie / Clear-Cookie). Aqui só disparamos as
// chamadas com `credentials: "include"` (já aplicado no helper apiRequest).

import { apiRequest } from "./api";

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface UserEnvelope {
  user: User;
}

export async function login(input: LoginInput): Promise<User> {
  const data = await apiRequest<UserEnvelope>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function register(input: RegisterInput): Promise<User> {
  const data = await apiRequest<UserEnvelope>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiRequest<unknown>("/auth/logout", { method: "POST" });
}

export async function me(): Promise<User> {
  const data = await apiRequest<UserEnvelope>("/auth/me");
  return data.user;
}

export async function refresh(): Promise<User> {
  const data = await apiRequest<UserEnvelope>("/auth/refresh", { method: "POST" });
  return data.user;
}
