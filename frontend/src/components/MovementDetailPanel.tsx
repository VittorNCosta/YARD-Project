import React from "react";
import {
  yardMovementActorLabel,
  yardMovementStatusLabel,
  type YardMovement,
  type YardMovementEvent,
} from "../services/yardMovements";
import { statusToVariant } from "../utils/status";

function formatDate(value?: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatWeight(value?: number): string {
  if (value === undefined) return "-";
  return `${new Intl.NumberFormat("pt-BR").format(value)} kg`;
}

function formatWeightDifference(value?: number): string {
  if (value === undefined) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("pt-BR").format(value)} kg`;
}

function getTimelineEvents(movement: YardMovement): YardMovementEvent[] {
  const events =
    movement.events && movement.events.length > 0
      ? movement.events
      : [
          {
            type: "CREATED" as const,
            toStatus: movement.status,
            createdBy: movement.createdBy,
            createdByUser: movement.createdByUser,
            createdAt: movement.createdAt,
          },
        ];

  return [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function getTimelineTitle(event: YardMovementEvent): string {
  if (event.type === "CREATED") {
    return "Autorizacao criada";
  }

  const from = event.fromStatus
    ? yardMovementStatusLabel(event.fromStatus)
    : "Inicio";
  const to = yardMovementStatusLabel(event.toStatus);
  return `${from} para ${to}`;
}

function getTimelineDetails(event: YardMovementEvent): string[] {
  const details: string[] = [];

  if (event.data?.dock) {
    details.push(`Doca: ${event.data.dock}`);
  }
  if (event.data?.entryWeight !== undefined) {
    details.push(`Peso entrada: ${formatWeight(event.data.entryWeight)}`);
  }
  if (event.data?.exitWeight !== undefined) {
    details.push(`Peso saida: ${formatWeight(event.data.exitWeight)}`);
  }
  if (event.statusReason) {
    details.push(`Motivo: ${event.statusReason}`);
  }

  return details;
}

interface MovementDetailPanelProps {
  movement: YardMovement;
}

const MovementDetailPanel: React.FC<MovementDetailPanelProps> = ({
  movement,
}) => (
  <>
    <div className="movement-detail-summary">
      <span className="placa">{movement.plateSnapshot}</span>
      <span>{movement.driverName}</span>
      <span
        className={`status-badge status-badge--${statusToVariant(
          yardMovementStatusLabel(movement.status)
        )}`}
      >
        {yardMovementStatusLabel(movement.status)}
      </span>
    </div>

    <div className="movement-detail-grid">
      <div>
        <span>Criado por</span>
        <strong>
          {yardMovementActorLabel(movement.createdByUser, movement.createdBy)}
        </strong>
      </div>
      <div>
        <span>Liberado por</span>
        <strong>
          {yardMovementActorLabel(movement.releasedByUser, movement.releasedBy)}
        </strong>
      </div>
      <div>
        <span>Cancelado por</span>
        <strong>
          {yardMovementActorLabel(
            movement.cancelledByUser,
            movement.cancelledBy
          )}
        </strong>
      </div>
      <div>
        <span>Chegada</span>
        <strong>{formatDate(movement.arrivalDate)}</strong>
      </div>
      <div>
        <span>Doca</span>
        <strong>{movement.dock ?? "-"}</strong>
      </div>
      <div>
        <span>Peso Entrada</span>
        <strong>{formatWeight(movement.entryWeight)}</strong>
      </div>
      <div>
        <span>Peso Saida</span>
        <strong>{formatWeight(movement.exitWeight)}</strong>
      </div>
      <div>
        <span>Diferenca</span>
        <strong>{formatWeightDifference(movement.weightDifference)}</strong>
      </div>
      <div>
        <span>Motivo</span>
        <strong>{movement.statusReason ?? "-"}</strong>
      </div>
    </div>

    <div className="timeline">
      <h4>Linha do tempo</h4>
      {getTimelineEvents(movement).map((event, index) => {
        const details = getTimelineDetails(event);
        return (
          <div className="timeline-item" key={`${event.createdAt}-${index}`}>
            <div className="timeline-marker" aria-hidden="true" />
            <div className="timeline-content">
              <div className="timeline-heading">
                <strong>{getTimelineTitle(event)}</strong>
                <span>{formatDate(event.createdAt)}</span>
              </div>
              <div className="timeline-meta">
                <span>
                  Usuario:{" "}
                  {yardMovementActorLabel(
                    event.createdByUser,
                    event.createdBy
                  )}
                </span>
                <span>Status: {yardMovementStatusLabel(event.toStatus)}</span>
              </div>
              {details.length > 0 && (
                <div className="timeline-details">
                  {details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </>
);

export default MovementDetailPanel;
