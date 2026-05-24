import React, { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Truck,
  Warehouse,
} from "lucide-react";
import { useDocks } from "../hooks/useDocks";
import { useYardMovements } from "../hooks/useYardMovements";
import { dockStatusLabel } from "../services/docks";
import {
  isOpenYardMovement,
  yardMovementActorLabel,
  yardMovementStatusLabel,
  type YardMovement,
} from "../services/yardMovements";
import { statusToSlug, statusToVariant } from "../utils/status";
import "./Dashboard.css";

const TOTAL_VAGAS = 40;

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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
}

function minutesSince(date: string): number {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function isCreatedInLast24Hours(movement: YardMovement): boolean {
  const createdAt = new Date(movement.createdAt).getTime();
  return Date.now() - createdAt <= 24 * 60 * 60 * 1000;
}

function isFinishedToday(movement: YardMovement): boolean {
  if (movement.status !== "FINISHED" || !movement.departureDate) return false;
  const departure = new Date(movement.departureDate);
  const today = new Date();
  return (
    departure.getFullYear() === today.getFullYear() &&
    departure.getMonth() === today.getMonth() &&
    departure.getDate() === today.getDate()
  );
}

function isSameStatusFilter(
  movement: YardMovement,
  filter: string
): boolean {
  if (filter === "todos") return true;
  if (filter === "DOCKED") return movement.status === "DOCKED";
  return movement.status === filter;
}

const Dashboard: React.FC = () => {
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const { movements, loading, error, refetch } = useYardMovements();
  const {
    docks,
    loading: docksLoading,
    error: docksError,
    refetch: refetchDocks,
  } = useDocks();

  const activeMovements = useMemo(
    () => movements.filter((movement) => isOpenYardMovement(movement.status)),
    [movements]
  );

  const metrics = useMemo(() => {
    const veiculosNaFila = movements.filter(
      (movement) => movement.status === "WAITING_QUEUE"
    ).length;
    const veiculosNoPatio = movements.filter(
      (movement) => movement.status === "YARD"
    ).length;
    const veiculosNaDoca = movements.filter(
      (movement) => movement.status === "DOCKED"
    ).length;
    const movimentacoesHoje = movements.filter(isCreatedInLast24Hours).length;
    const finalizadosHoje = movements.filter(isFinishedToday).length;
    const tempoTotal = activeMovements.reduce(
      (total, movement) => total + minutesSince(movement.arrivalDate),
      0
    );
    const tempoMedioEspera =
      activeMovements.length > 0
        ? formatDuration(Math.round(tempoTotal / activeMovements.length))
        : "0min";

    return {
      veiculosNaFila,
      veiculosNoPatio,
      veiculosNaDoca,
      vagasDisponiveis: Math.max(
        0,
        TOTAL_VAGAS - veiculosNoPatio - veiculosNaDoca
      ),
      totalVagas: TOTAL_VAGAS,
      tempoMedioEspera,
      movimentacoesHoje,
      finalizadosHoje,
    };
  }, [activeMovements, movements]);

  const veiculosFiltrados = useMemo(
    () =>
      movements.filter((movement) =>
        isSameStatusFilter(movement, filtroStatus)
      ),
    [movements, filtroStatus]
  );

  const ocupacaoPatio =
    ((metrics.veiculosNoPatio + metrics.veiculosNaDoca) /
      metrics.totalVagas) *
    100;
  const ocupacaoPatioInt = Math.round(ocupacaoPatio);

  const dockMovements = useMemo(() => {
    const map = new Map<string, YardMovement>();
    for (const movement of activeMovements) {
      if (movement.status === "DOCKED" && movement.dock) {
        map.set(movement.dock, movement);
      }
    }
    return map;
  }, [activeMovements]);

  const errorMessage = error ?? docksError;

  const refreshAll = useCallback(async () => {
    await Promise.all([refetch(), refetchDocks()]);
  }, [refetch, refetchDocks]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2><ClipboardList aria-hidden="true" /> Painel de Controle - Patio</h2>
        <div className="date-time">
          <span><Calendar aria-hidden="true" /> {formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" aria-hidden="true"><Truck /></div>
          <div className="kpi-content">
            <h3>Veiculos no Patio</h3>
            <p className="kpi-value">{metrics.veiculosNoPatio}</p>
            <span>Aguardando doca</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" aria-hidden="true"><Clock /></div>
          <div className="kpi-content">
            <h3>Na Fila de Espera</h3>
            <p className="kpi-value">{metrics.veiculosNaFila}</p>
            <span>Com entrada autorizada</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" aria-hidden="true"><Warehouse /></div>
          <div className="kpi-content">
            <h3>Nas Docas</h3>
            <p className="kpi-value">{metrics.veiculosNaDoca}</p>
            <span>{docks.length} docas cadastradas</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" aria-hidden="true"><MapPin /></div>
          <div className="kpi-content">
            <h3>Vagas Disponiveis</h3>
            <p className="kpi-value">{metrics.vagasDisponiveis}</p>
            <span>De {metrics.totalVagas} totais</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" aria-hidden="true"><Clock /></div>
          <div className="kpi-content">
            <h3>Tempo Medio</h3>
            <p className="kpi-value">{metrics.tempoMedioEspera}</p>
            <span>Desde a chegada</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" aria-hidden="true"><ClipboardList /></div>
          <div className="kpi-content">
            <h3>Finalizados Hoje</h3>
            <p className="kpi-value">{metrics.finalizadosHoje}</p>
            <span>{metrics.movimentacoesHoje} criadas em 24h</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="alertas-section" role="alert">
          <h3><AlertTriangle aria-hidden="true" /> Falha ao carregar patio</h3>
          <div className="alertas-list">
            <div className="alerta warning">
              <span>{errorMessage}</span>
              <button className="btn btn--secondary" onClick={() => void refreshAll()}>
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="alertas-section">
        <h3><AlertTriangle aria-hidden="true" /> Alertas</h3>
        <div className="alertas-list">
          {activeMovements.length === 0 ? (
            <div className="alerta success">
              <span><CheckCircle2 aria-hidden="true" /> Nenhuma movimentacao ativa no patio.</span>
            </div>
          ) : (
            activeMovements
              .filter((movement) => minutesSince(movement.arrivalDate) >= 120)
              .slice(0, 3)
              .map((movement) => (
                <div className="alerta warning" key={movement.id}>
                  <span>
                    <Clock aria-hidden="true" /> {movement.plateSnapshot} aguardando ha {formatDuration(minutesSince(movement.arrivalDate))}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="occupation-section">
        <h3><MapPin aria-hidden="true" /> Ocupacao do Patio</h3>
        <div
          className="occupation-bar"
          role="progressbar"
          aria-valuenow={ocupacaoPatioInt}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Ocupacao do patio"
        >
          <div
            className="occupation-fill"
            style={{ width: `${Math.min(100, ocupacaoPatio)}%` }}
          >
            {ocupacaoPatio.toFixed(1)}% ocupado
          </div>
        </div>
        <div className="occupation-legend">
          <span><span className="dot dot--success" aria-hidden="true"></span> Patio: {metrics.veiculosNoPatio}</span>
          <span><span className="dot dot--info" aria-hidden="true"></span> Docas: {metrics.veiculosNaDoca}</span>
          <span><span className="dot dot--warning" aria-hidden="true"></span> Fila: {metrics.veiculosNaFila}</span>
          <span><span className="dot dot--neutral" aria-hidden="true"></span> Vagas: {metrics.vagasDisponiveis}</span>
        </div>
      </div>

      <div className="veiculos-section">
        <div className="section-header">
          <h3><Truck aria-hidden="true" /> Autorizacoes e Movimentacoes</h3>
          <div className="filters">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="status-filter"
              aria-label="Filtrar veiculos por status"
            >
              <option value="todos">Todos os status</option>
              <option value="WAITING_QUEUE">Na Fila</option>
              <option value="YARD">No Patio</option>
              <option value="DOCKED">Nas Docas</option>
              <option value="FINISHED">Finalizados</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="veiculos-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Status</th>
                <th>Doca</th>
                <th>Data Chegada</th>
                <th>Data Saida</th>
                <th>Liberado por</th>
                <th>Tipo Processo</th>
                <th>Peso Entrada</th>
                <th>Peso Saida</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Carregando movimentacoes...</td>
                </tr>
              ) : veiculosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9}>Nenhuma autorizacao de entrada criada ainda.</td>
                </tr>
              ) : (
                veiculosFiltrados.map((movement) => {
                  const label = yardMovementStatusLabel(movement.status);
                  return (
                    <tr key={movement.id} className={movement.status === "FINISHED" ? "finalizado" : ""}>
                      <td><span className="placa">{movement.plateSnapshot}</span></td>
                      <td>
                        <span className={`status-badge status-badge--${statusToVariant(label)} status-${statusToSlug(label)}`}>
                          {label}
                        </span>
                      </td>
                      <td>{movement.dock ?? "-"}</td>
                      <td>{formatDate(movement.arrivalDate)}</td>
                      <td>{formatDate(movement.departureDate)}</td>
                      <td>
                        {yardMovementActorLabel(
                          movement.releasedByUser,
                          movement.releasedBy
                        )}
                      </td>
                      <td>{movement.processType ?? "-"}</td>
                      <td>{formatWeight(movement.entryWeight)}</td>
                      <td>{formatWeight(movement.exitWeight)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="docas-section">
        <h3><Warehouse aria-hidden="true" /> Status das Docas</h3>
        <div className="docas-grid">
          {docksLoading ? (
            <div className="doca-card neutra">
              <h4>Carregando</h4>
              <p><Clock aria-hidden="true" /> Consultando docas...</p>
            </div>
          ) : docks.length === 0 ? (
            <div className="doca-card neutra">
              <h4>Sem docas</h4>
              <p><AlertTriangle aria-hidden="true" /> Cadastre docas para operar.</p>
            </div>
          ) : (
            docks.map((dock) => {
              const movement = dockMovements.get(dock.code);
              const cardStatus = movement
                ? "ocupada"
                : dock.status === "ACTIVE"
                  ? "disponivel"
                  : dock.status === "MAINTENANCE"
                    ? "manutencao"
                    : "inativa";

              return (
                <div key={dock.id} className={`doca-card ${cardStatus}`}>
                  <h4>{dock.code}</h4>
                  {movement ? (
                    <>
                      <p><Truck aria-hidden="true" /> {movement.plateSnapshot}</p>
                      <span>{movement.processType ?? "Operacao em andamento"}</span>
                    </>
                  ) : dock.status === "ACTIVE" ? (
                    <p><CheckCircle2 aria-hidden="true" /> Disponivel</p>
                  ) : (
                    <>
                      <p><AlertTriangle aria-hidden="true" /> {dockStatusLabel(dock.status)}</p>
                      <span>{dock.maintenanceReason ?? "Fora de operacao"}</span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
