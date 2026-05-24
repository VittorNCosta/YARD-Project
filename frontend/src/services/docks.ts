import { apiRequest } from "./api";

export type DockStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface Dock {
  id: string;
  code: string;
  name?: string;
  status: DockStatus;
  maintenanceReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DockPayload {
  code: string;
  name?: string;
  status?: DockStatus;
  maintenanceReason?: string;
}

export type UpdateDockPayload = Partial<DockPayload>;

export function dockStatusLabel(status: DockStatus): string {
  const labels: Record<DockStatus, string> = {
    ACTIVE: "Ativa",
    INACTIVE: "Inativa",
    MAINTENANCE: "Manutencao",
  };

  return labels[status];
}

export function listDocks(): Promise<Dock[]> {
  return apiRequest<Dock[]>("/docks");
}

export function createDock(input: DockPayload): Promise<Dock> {
  return apiRequest<Dock>("/docks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDock(
  id: string,
  input: UpdateDockPayload
): Promise<Dock> {
  return apiRequest<Dock>(`/docks/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteDock(id: string): Promise<void> {
  return apiRequest<void>(`/docks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

