import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import {
  createDock as apiCreateDock,
  deleteDock as apiDeleteDock,
  listDocks as apiListDocks,
  updateDock as apiUpdateDock,
  type Dock,
  type DockPayload,
  type UpdateDockPayload,
} from "../services/docks";

export interface UseDocksResult {
  docks: Dock[];
  activeDocks: Dock[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (input: DockPayload) => Promise<Dock>;
  update: (id: string, input: UpdateDockPayload) => Promise<Dock>;
  remove: (id: string) => Promise<void>;
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Nao foi possivel contatar o servidor.";
    if (err.message === "dock.already-exists") {
      return "Ja existe uma doca cadastrada com este codigo.";
    }
    if (err.message === "dock.not-found") {
      return "Doca nao encontrada.";
    }
    if (err.message === "dock.occupied") {
      return "Esta doca esta ocupada e nao pode ser alterada ou removida agora.";
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro desconhecido.";
}

export function useDocks(): UseDocksResult {
  const [docks, setDocks] = useState<Dock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListDocks();
      setDocks(data);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(async (input: DockPayload): Promise<Dock> => {
    setError(null);
    try {
      const created = await apiCreateDock(input);
      setDocks((prev) => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
      return created;
    } catch (err) {
      const message = extractMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const update = useCallback(
    async (id: string, input: UpdateDockPayload): Promise<Dock> => {
      setError(null);
      try {
        const updated = await apiUpdateDock(id, input);
        setDocks((prev) =>
          prev
            .map((dock) => (dock.id === id ? updated : dock))
            .sort((a, b) => a.code.localeCompare(b.code))
        );
        return updated;
      } catch (err) {
        const message = extractMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    setError(null);
    const snapshot = docks;
    setDocks((prev) => prev.filter((dock) => dock.id !== id));
    try {
      await apiDeleteDock(id);
    } catch (err) {
      setDocks(snapshot);
      const message = extractMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, [docks]);

  const activeDocks = useMemo(
    () => docks.filter((dock) => dock.status === "ACTIVE"),
    [docks]
  );

  return useMemo(
    () => ({
      docks,
      activeDocks,
      loading,
      error,
      refetch,
      create,
      update,
      remove,
    }),
    [docks, activeDocks, loading, error, refetch, create, update, remove]
  );
}
