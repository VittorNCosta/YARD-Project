// src/services/api.ts
// Camada HTTP tipada para consumo do backend YardControl.
// Mantém a forma de resposta padrão da API: { success, data, count?, message? }.

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/* ------------------------------------------------------------------ */
/* Tipos compartilhados com o backend                                 */
/* ------------------------------------------------------------------ */

/** Resposta padrão do backend. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
}

/** Status operacional (ciclo de vida de movimentação no pátio). */
export type VehicleStatus = string;

/** Status cadastral (Ativo/Inativo). */
export type VehicleActiveStatus = "Ativo" | "Inativo";

/**
 * Representação do veículo retornada pelo backend.
 * Espelha `IVehicle` (Mongoose) — campos opcionais refletem os da model.
 */
export interface Vehicle {
  _id: string;
  plate: string;
  driverName: string;
  cargoType: string;
  status: VehicleStatus;
  entryDate?: string;

  color?: string;
  driverCpf?: string;
  vehicleType?: string;
  weighingRequired?: boolean;
  activeStatus?: VehicleActiveStatus;
  arrivalDate?: string;
  departureDate?: string;
  releasedBy?: string;
  processType?: string;
  entryWeight?: string;
  exitWeight?: string;
  dock?: string;

  createdAt?: string;
  updatedAt?: string;
}

/** Payload aceito para criação de veículo (campos controlados pelo form). */
export interface CreateVehiclePayload {
  plate: string;
  driverName: string;
  cargoType: string;
  status: VehicleStatus;
  color?: string;
  driverCpf?: string;
  vehicleType?: string;
  weighingRequired?: boolean;
  activeStatus?: VehicleActiveStatus;
}

/**
 * Payload aceito por PUT /vehicles/:id (atualização parcial).
 * Todos os campos são opcionais; o backend exige pelo menos um.
 */
export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

/* ------------------------------------------------------------------ */
/* Erro HTTP tipado                                                    */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/* ------------------------------------------------------------------ */
/* Refresh-on-401: singleton compartilhado para evitar tempestade       */
/* ------------------------------------------------------------------ */

const AUTH_PATHS_NO_REFRESH = new Set<string>([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
]);

let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Libera o singleton no próximo tick para que requests concorrentes
      // já tenham reusado a Promise antes do reset.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

/* ------------------------------------------------------------------ */
/* Helper interno: fetch + parsing da forma { success, data, ... }     */
/* ------------------------------------------------------------------ */

interface RawResponse {
  response: Response;
  body: unknown;
  text: string;
}

async function rawFetch(path: string, init?: RequestInit): Promise<RawResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    // Falha de rede (servidor fora do ar, DNS, CORS, etc.)
    throw new ApiError(
      err instanceof Error ? err.message : "Falha de rede ao contatar a API",
      0,
      err
    );
  }

  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError(
        `Resposta inválida da API (${response.status})`,
        response.status,
        text
      );
    }
  }

  return { response, body, text };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let { response, body } = await rawFetch(path, init);

  // Refresh-on-401: tenta refresh + re-tenta original UMA vez.
  if (response.status === 401 && !AUTH_PATHS_NO_REFRESH.has(path)) {
    const refreshed = await performRefresh();
    if (refreshed) {
      ({ response, body } = await rawFetch(path, init));
    } else {
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
  }

  const parsed = body as ApiResponse<T> | undefined;

  if (!response.ok || (parsed && parsed.success === false)) {
    const message =
      parsed?.message ??
      `Requisição falhou com status ${response.status}`;
    throw new ApiError(message, response.status, parsed ?? body);
  }

  // Endpoints que não retornam `data` (ex.: DELETE) são tratados como void.
  // Endpoints que não usam o envelope { success, data } retornam o corpo cru.
  if (parsed && Object.prototype.hasOwnProperty.call(parsed, "data")) {
    return (parsed.data ?? (undefined as unknown as T));
  }
  return (body as T) ?? (undefined as unknown as T);
}

/** Acesso ao helper para módulos de serviço que precisam fazer requests crus. */
export function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

/* ------------------------------------------------------------------ */
/* Endpoints /api/vehicles                                             */
/* ------------------------------------------------------------------ */

/** GET /vehicles — lista todos os veículos. */
export function listVehicles(): Promise<Vehicle[]> {
  return request<Vehicle[]>("/vehicles");
}

/** GET /vehicles/:id — detalha um veículo. */
export function getVehicleById(id: string): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${encodeURIComponent(id)}`);
}

/** POST /vehicles — cria um veículo. */
export function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  return request<Vehicle>("/vehicles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PUT /vehicles/:id/status — atualiza status operacional. */
export function updateVehicleStatus(
  id: string,
  status: VehicleStatus
): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/** PUT /vehicles/:id — atualização parcial completa (novo endpoint DDD). */
export function updateVehicle(
  id: string,
  payload: UpdateVehiclePayload
): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE /vehicles/:id — remove um veículo. */
export function deleteVehicle(id: string): Promise<void> {
  return request<void>(`/vehicles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------------ */
/* Endpoints /api/reports                                              */
/* ------------------------------------------------------------------ */

/**
 * Bucket genérico (chave + contagem + percentual) usado pelos gráficos
 * de composição. Espelha o DTO `FleetReportBucket` do backend.
 */
export interface FleetReportBucket {
  key: string;
  count: number;
  percentage: number;
}

export interface FleetReportMonthlyBucket {
  /** Formato `YYYY-MM`. */
  month: string;
  count: number;
}

export interface FleetReportRoleBucket {
  role: string;
  count: number;
}

export interface FleetReport {
  generatedAt: string;
  period: {
    from: string | null;
    to: string | null;
  };
  kpis: {
    totalVehicles: number;
    activePercentage: number;
    weighingRequiredPercentage: number;
    distinctVehicleTypes: number;
  };
  composition: {
    byVehicleType: FleetReportBucket[];
    byActiveStatus: FleetReportBucket[];
    byWeighingRequired: FleetReportBucket[];
  };
  registrationsByMonth: FleetReportMonthlyBucket[];
  /** Presente apenas quando o caller é admin. */
  usersByRole?: FleetReportRoleBucket[];
}

export interface FleetReportFilters {
  from?: string;
  to?: string;
}

/** GET /reports/fleet — métricas agregadas de frota. */
export function getFleetReport(
  filters: FleetReportFilters = {}
): Promise<FleetReport> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return request<FleetReport>(
    qs.length > 0 ? `/reports/fleet?${qs}` : "/reports/fleet"
  );
}
