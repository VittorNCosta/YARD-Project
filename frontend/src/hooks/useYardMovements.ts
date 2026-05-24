import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import {
  createYardMovement as apiCreateYardMovement,
  isOpenYardMovement,
  listYardMovements as apiListYardMovements,
  updateYardMovementStatus as apiUpdateYardMovementStatus,
  type CreateYardMovementInput,
  type UpdateYardMovementStatusInput,
  type YardMovement,
} from "../services/yardMovements";

export interface UseYardMovementsResult {
  movements: YardMovement[];
  loading: boolean;
  error: string | null;
  openByVehicleId: Map<string, YardMovement>;
  refetch: () => Promise<void>;
  createAuthorization: (input: CreateYardMovementInput) => Promise<YardMovement>;
  updateStatus: (
    id: string,
    input: UpdateYardMovementStatusInput
  ) => Promise<YardMovement>;
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Nao foi possivel contatar o servidor.";
    if (err.message === "yard-movement.open-movement-already-exists") {
      return "Este veiculo ja possui uma autorizacao de entrada aberta.";
    }
    if (err.message === "yard-movement.vehicle-inactive") {
      return "Veiculo inativo nao pode receber autorizacao de entrada.";
    }
    if (err.message === "yard-movement.dock-already-occupied") {
      return "Esta doca ja esta ocupada por outra movimentacao.";
    }
    if (err.message === "dock.not-found") {
      return "A doca selecionada nao esta cadastrada.";
    }
    if (err.message === "dock.not-available") {
      return "A doca selecionada nao esta ativa para operacao.";
    }
    if (err.message === "yard-movement.status-reason-required") {
      return "Informe o motivo para cancelar ou recusar a movimentacao.";
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro desconhecido.";
}

export function useYardMovements(): UseYardMovementsResult {
  const [movements, setMovements] = useState<YardMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListYardMovements();
      setMovements(data);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createAuthorization = useCallback(
    async (input: CreateYardMovementInput): Promise<YardMovement> => {
      setError(null);
      try {
        const created = await apiCreateYardMovement(input);
        setMovements((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const message = extractMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (
      id: string,
      input: UpdateYardMovementStatusInput
    ): Promise<YardMovement> => {
      setError(null);
      try {
        const updated = await apiUpdateYardMovementStatus(id, input);
        setMovements((prev) =>
          prev.map((movement) => (movement.id === id ? updated : movement))
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

  const openByVehicleId = useMemo(() => {
    const map = new Map<string, YardMovement>();
    for (const movement of movements) {
      if (isOpenYardMovement(movement.status)) {
        map.set(movement.vehicleId, movement);
      }
    }
    return map;
  }, [movements]);

  return useMemo(
    () => ({
      movements,
      loading,
      error,
      openByVehicleId,
      refetch,
      createAuthorization,
      updateStatus,
    }),
    [
      movements,
      loading,
      error,
      openByVehicleId,
      refetch,
      createAuthorization,
      updateStatus,
    ]
  );
}
