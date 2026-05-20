// src/hooks/useUsers.ts
// Hook de consumo do recurso /api/users com paginação/busca server-driven.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import {
  createUser as apiCreateUser,
  deleteUser as apiDeleteUser,
  listUsers as apiListUsers,
  updateUser as apiUpdateUser,
  updateUserRole as apiUpdateUserRole,
  type CreateUserInput,
  type UpdateUserInput,
} from "../services/users";
import type { User, UserRole } from "../services/auth";

export interface UseUsersOptions {
  initialPage?: number;
  initialPerPage?: number;
}

export interface UseUsersResult {
  users: User[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  refetch: () => Promise<void>;
  create: (input: CreateUserInput) => Promise<User>;
  update: (id: string, input: UpdateUserInput) => Promise<User>;
  changeRole: (id: string, role: UserRole) => Promise<User>;
  remove: (id: string) => Promise<void>;
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Não foi possível contatar o servidor.";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro desconhecido.";
}

export function useUsers(options: UseUsersOptions = {}): UseUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPageState] = useState<number>(options.initialPage ?? 1);
  const [perPage, setPerPageState] = useState<number>(options.initialPerPage ?? 20);
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce 300ms para o termo de busca.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageState(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const fetchPage = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiListUsers({
        page,
        perPage,
        q: debouncedSearch || undefined,
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const create = useCallback(async (input: CreateUserInput): Promise<User> => {
    try {
      const created = await apiCreateUser(input);
      await fetchPage();
      return created;
    } catch (err) {
      const message = extractMessage(err);
      setError(message);
      throw err;
    }
  }, [fetchPage]);

  const update = useCallback(async (id: string, input: UpdateUserInput): Promise<User> => {
    try {
      const updated = await apiUpdateUser(id, input);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err) {
      const message = extractMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const changeRole = useCallback(async (id: string, role: UserRole): Promise<User> => {
    try {
      const updated = await apiUpdateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err) {
      const message = extractMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await apiDeleteUser(id);
      // Se a página ficou vazia após remoção, volta uma página.
      const remaining = users.length - 1;
      if (remaining <= 0 && page > 1) {
        setPageState((p) => Math.max(1, p - 1));
      } else {
        await fetchPage();
      }
    } catch (err) {
      const message = extractMessage(err);
      setError(message);
      throw err;
    }
  }, [users.length, page, fetchPage]);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const setPerPage = useCallback((next: number) => {
    setPerPageState(next);
    setPageState(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return useMemo(
    () => ({
      users,
      total,
      page,
      perPage,
      totalPages,
      loading,
      error,
      search: searchInput,
      setSearch: setSearchInput,
      setPage,
      setPerPage,
      refetch: fetchPage,
      create,
      update,
      changeRole,
      remove,
    }),
    [
      users,
      total,
      page,
      perPage,
      totalPages,
      loading,
      error,
      searchInput,
      setPage,
      setPerPage,
      fetchPage,
      create,
      update,
      changeRole,
      remove,
    ]
  );
}
