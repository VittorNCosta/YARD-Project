import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  getFleetReport,
  type FleetReport,
  type FleetReportFilters,
} from "../services/api";

/**
 * Estado canônico de um dashboard alimentado por endpoint async.
 *
 * Mantemos `data | null | undefined` distintos:
 *  - `undefined` → estado inicial, antes do primeiro fetch.
 *  - `null`      → fetch concluído mas sem dado relevante (no caso de Fleet
 *                  isso não acontece; o backend sempre devolve um envelope).
 *  - `T`         → dado pronto para renderização.
 */
export interface UseFleetReportResult {
  data: FleetReport | null;
  loading: boolean;
  error: string | null;
  filters: FleetReportFilters;
  setFilters: (next: FleetReportFilters) => void;
  refetch: () => Promise<void>;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Não foi possível contatar o servidor.";
    if (err.status === 401) return "Sessão expirada — faça login de novo.";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro desconhecido ao carregar o relatório.";
}

/**
 * Carrega o relatório de frota e expõe estado padronizado para a UI.
 *
 * Filtros são passados como objeto inteiro — qualquer mudança refaz o
 * fetch. O hook é desenhado para uma única tela por vez (sem cache).
 */
export function useFleetReport(
  initialFilters: FleetReportFilters = {}
): UseFleetReportResult {
  const [filters, setFiltersState] = useState<FleetReportFilters>(
    initialFilters
  );
  const [data, setData] = useState<FleetReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (current: FleetReportFilters): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const report = await getFleetReport(current);
        setData(report);
      } catch (err) {
        setError(extractErrorMessage(err));
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchReport(filters);
  }, [fetchReport, filters]);

  const setFilters = useCallback((next: FleetReportFilters): void => {
    setFiltersState(next);
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchReport(filters);
  }, [fetchReport, filters]);

  return useMemo(
    () => ({ data, loading, error, filters, setFilters, refetch }),
    [data, loading, error, filters, setFilters, refetch]
  );
}
