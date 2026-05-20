// src/hooks/useVehicles.ts
// Ponto único de consumo do recurso "veículos" pela UI.
// Encapsula estado (lista/loading/error), operações CRUD e o mapeamento PT↔EN
// entre o vocabulário do formulário (pt-BR) e o modelo do backend (EN).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createVehicle as apiCreateVehicle,
  deleteVehicle as apiDeleteVehicle,
  listVehicles as apiListVehicles,
  updateVehicleStatus as apiUpdateVehicleStatus,
  type CreateVehiclePayload,
  type Vehicle,
  type VehicleActiveStatus,
} from "../services/api";

/* ------------------------------------------------------------------ */
/* Tipos expostos para a UI (vocabulário pt-BR)                        */
/* ------------------------------------------------------------------ */

export type TipoVeiculo = "Truck" | "Van" | "Carreta" | "Toco" | "Bitrem" | "VUC";
export type StatusVeiculo = VehicleActiveStatus;

/** Forma que a página de veículos consome. */
export interface Veiculo {
  id: string;
  placa: string;
  cor: string;
  motorista: string;
  cpf: string;
  tipo: TipoVeiculo;
  pesagemObrigatoria: boolean;
  status: StatusVeiculo;
}

/** Dados que o formulário envia para criar/editar. */
export interface VeiculoFormData {
  placa: string;
  cor: string;
  motorista: string;
  cpf: string;
  tipo: TipoVeiculo;
  pesagemObrigatoria: boolean;
  status: StatusVeiculo;
}

/* ------------------------------------------------------------------ */
/* Mapeamento PT ↔ EN                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_CARGO_TYPE = "Geral";

/** Backend (EN) → UI (PT). Tolerante a registros antigos incompletos. */
function toVeiculo(v: Vehicle): Veiculo {
  // `activeStatus` é o campo dedicado ao status cadastral.
  // Para registros que só possuem `status` (campo operacional),
  // tentamos inferir Ativo/Inativo pela string salva.
  const active: StatusVeiculo =
    v.activeStatus === "Inativo" || v.status === "Inativo"
      ? "Inativo"
      : "Ativo";

  const tipo = (v.vehicleType as TipoVeiculo) ?? "Truck";

  return {
    id: v._id,
    placa: v.plate,
    cor: v.color ?? "",
    motorista: v.driverName,
    cpf: v.driverCpf ?? "",
    tipo,
    pesagemObrigatoria: Boolean(v.weighingRequired),
    status: active,
  };
}

/** UI (PT) → Backend (EN) para criação. */
function toCreatePayload(form: VeiculoFormData): CreateVehiclePayload {
  return {
    plate: form.placa,
    driverName: form.motorista,
    driverCpf: form.cpf,
    color: form.cor,
    vehicleType: form.tipo,
    weighingRequired: form.pesagemObrigatoria,
    activeStatus: form.status,
    // O backend exige `cargoType` e `status`. Como o cadastro atual não coleta
    // esses campos (eles pertencem ao fluxo de movimentação), preenchemos
    // valores default coerentes para satisfazer o schema.
    // TODO: remover quando houver form dedicado a movimentação/pesagem.
    cargoType: DEFAULT_CARGO_TYPE,
    status: form.status,
  };
}

/* ------------------------------------------------------------------ */
/* Hook principal                                                      */
/* ------------------------------------------------------------------ */

export interface UseVehiclesResult {
  vehicles: Veiculo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (form: VeiculoFormData) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Não foi possível contatar o servidor.";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro desconhecido.";
}

export function useVehicles(): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListVehicles();
      setVehicles(data.map(toVeiculo));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (form: VeiculoFormData): Promise<void> => {
      setError(null);
      try {
        const created = await apiCreateVehicle(toCreatePayload(form));
        setVehicles((prev) => [toVeiculo(created), ...prev]);
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  const toggleStatus = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const current = vehicles.find((v) => v.id === id);
      if (!current) return;

      const next: StatusVeiculo = current.status === "Ativo" ? "Inativo" : "Ativo";

      // Atualização otimista — revertemos em caso de falha.
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: next } : v))
      );

      try {
        // O backend só expõe PUT /:id/status (campo `status`). Esse endpoint
        // aceita qualquer string; escrevemos "Ativo"/"Inativo" para persistir
        // o estado cadastral. O `toVeiculo` consegue ler de volta tanto de
        // `activeStatus` quanto de `status`.
        // TODO: quando o backend expuser PUT /:id/active-status, migrar.
        await apiUpdateVehicleStatus(id, next);
      } catch (err) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === id ? { ...v, status: current.status } : v))
        );
        const message = extractErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [vehicles]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const snapshot = vehicles;
      // Otimista.
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      try {
        await apiDeleteVehicle(id);
      } catch (err) {
        setVehicles(snapshot);
        const message = extractErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [vehicles]
  );

  return useMemo(
    () => ({ vehicles, loading, error, refetch, create, toggleStatus, remove }),
    [vehicles, loading, error, refetch, create, toggleStatus, remove]
  );
}
