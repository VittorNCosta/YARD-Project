import { apiRequest } from "./api";

export type YardMovementStatus =
  | "WAITING_QUEUE"
  | "GATE_CHECK"
  | "ENTRY_WEIGHING"
  | "YARD"
  | "DOCKED"
  | "AWAITING_RELEASE"
  | "EXIT_WEIGHING"
  | "RELEASED"
  | "FINISHED"
  | "CANCELLED"
  | "REJECTED";

export type YardMovementEventType = "CREATED" | "STATUS_CHANGED";

export interface YardMovementEventData {
  entryWeight?: number;
  exitWeight?: number;
  dock?: string;
  departureDate?: string;
}

export interface YardMovementActor {
  id?: string;
  name?: string;
  email?: string;
}

export interface YardMovementEvent {
  type: YardMovementEventType;
  fromStatus?: YardMovementStatus;
  toStatus: YardMovementStatus;
  statusReason?: string;
  createdBy?: string;
  createdByUser?: YardMovementActor;
  createdAt: string;
  data?: YardMovementEventData;
}

export interface YardMovement {
  id: string;
  vehicleId: string;
  plateSnapshot: string;
  driverName: string;
  driverCpf?: string;
  cargoType: string;
  processType?: string;
  status: YardMovementStatus;
  weighingRequired: boolean;
  entryWeight?: number;
  exitWeight?: number;
  dock?: string;
  arrivalDate: string;
  departureDate?: string;
  createdBy?: string;
  releasedBy?: string;
  cancelledBy?: string;
  createdByUser?: YardMovementActor;
  releasedByUser?: YardMovementActor;
  cancelledByUser?: YardMovementActor;
  statusReason?: string;
  events?: YardMovementEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateYardMovementInput {
  vehicleId: string;
  driverName: string;
  driverCpf?: string;
  cargoType: string;
  processType?: string;
  weighingRequired?: boolean;
  arrivalDate?: string;
}

export interface UpdateYardMovementStatusInput {
  status: YardMovementStatus;
  entryWeight?: number;
  exitWeight?: number;
  dock?: string;
  statusReason?: string;
  departureDate?: string;
}

const FINAL_STATUSES = new Set<YardMovementStatus>([
  "FINISHED",
  "CANCELLED",
  "REJECTED",
]);

export function isOpenYardMovement(status: YardMovementStatus): boolean {
  return !FINAL_STATUSES.has(status);
}

export function yardMovementStatusLabel(status: YardMovementStatus): string {
  const labels: Record<YardMovementStatus, string> = {
    WAITING_QUEUE: "Fila",
    GATE_CHECK: "Portaria",
    ENTRY_WEIGHING: "Pesagem Entrada",
    YARD: "Patio",
    DOCKED: "Doca",
    AWAITING_RELEASE: "Aguardando Liberacao",
    EXIT_WEIGHING: "Pesagem Saida",
    RELEASED: "Liberado",
    FINISHED: "Finalizado",
    CANCELLED: "Cancelado",
    REJECTED: "Recusado",
  };

  return labels[status];
}

export function yardMovementActorLabel(
  actor?: YardMovementActor,
  fallback?: string
): string {
  return actor?.name ?? actor?.email ?? fallback ?? "-";
}

export function listYardMovements(): Promise<YardMovement[]> {
  return apiRequest<YardMovement[]>("/yard-movements");
}

export function getYardMovementById(id: string): Promise<YardMovement> {
  return apiRequest<YardMovement>(
    `/yard-movements/${encodeURIComponent(id)}`
  );
}

export function createYardMovement(
  input: CreateYardMovementInput
): Promise<YardMovement> {
  return apiRequest<YardMovement>("/yard-movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateYardMovementStatus(
  id: string,
  input: UpdateYardMovementStatusInput
): Promise<YardMovement> {
  return apiRequest<YardMovement>(
    `/yard-movements/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}
