import React, { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Scale,
  Truck,
  X,
} from "lucide-react";
import { useVehicles, type Veiculo } from "../hooks/useVehicles";
import { useDocks } from "../hooks/useDocks";
import { useYardMovements } from "../hooks/useYardMovements";
import {
  isOpenYardMovement,
  yardMovementStatusLabel,
  type YardMovementEvent,
  type UpdateYardMovementStatusInput,
  type YardMovement,
  type YardMovementStatus,
} from "../services/yardMovements";
import { useToast } from "../components/Toast";
import { statusToSlug, statusToVariant } from "../utils/status";
import "./Authorizations.css";

interface AuthorizationFormData {
  vehicleId: string;
  motorista: string;
  cpf: string;
  cargoType: string;
  processType: string;
  pesagemObrigatoria: boolean;
}

interface MovementActionFormData {
  entryWeight: string;
  exitWeight: string;
  dock: string;
  statusReason: string;
}

type MovementActionField = keyof MovementActionFormData;

interface MovementAction {
  label: string;
  nextStatus: YardMovementStatus;
  fields: MovementActionField[];
  tone?: "default" | "danger";
}

const INITIAL_FORM: AuthorizationFormData = {
  vehicleId: "",
  motorista: "",
  cpf: "",
  cargoType: "Geral",
  processType: "Carga",
  pesagemObrigatoria: false,
};

const INITIAL_ACTION_FORM: MovementActionFormData = {
  entryWeight: "",
  exitWeight: "",
  dock: "",
  statusReason: "",
};

const TIPOS_PROCESSO = ["Carga", "Descarga", "Carga/Descarga", "Aguardando"];
const TIPOS_CARGA = [
  "Geral",
  "Alimentos",
  "Bebidas",
  "Quimicos",
  "Secos",
  "Refrigerados",
];

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

function parseDateInput(value: string, endOfDay = false): number | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function movementMatchesFilter(
  movement: YardMovement,
  statusFilter: string,
  term: string,
  dateFrom: string,
  dateTo: string,
  reasonFilter: string
): boolean {
  const matchesStatus =
    statusFilter === "todos" ||
    (statusFilter === "abertas" && isOpenYardMovement(movement.status)) ||
    (statusFilter === "fechadas" && !isOpenYardMovement(movement.status)) ||
    movement.status === statusFilter;

  const normalizedTerm = term.trim().toLowerCase();
  const matchesTerm =
    normalizedTerm.length === 0 ||
    movement.plateSnapshot.toLowerCase().includes(normalizedTerm) ||
    movement.driverName.toLowerCase().includes(normalizedTerm);

  const movementDate = new Date(movement.arrivalDate).getTime();
  const fromTimestamp = parseDateInput(dateFrom);
  const toTimestamp = parseDateInput(dateTo, true);
  const matchesDate =
    (fromTimestamp === null || movementDate >= fromTimestamp) &&
    (toTimestamp === null || movementDate <= toTimestamp);

  const normalizedReason = reasonFilter.trim().toLowerCase();
  const matchesReason =
    normalizedReason.length === 0 ||
    (movement.statusReason ?? "").toLowerCase().includes(normalizedReason);

  return matchesStatus && matchesTerm && matchesDate && matchesReason;
}

function getNextMovementAction(movement: YardMovement): MovementAction | null {
  switch (movement.status) {
    case "WAITING_QUEUE":
      return {
        label: "Chamar portaria",
        nextStatus: "GATE_CHECK",
        fields: [],
      };
    case "GATE_CHECK":
      return movement.weighingRequired
        ? {
            label: "Enviar pesagem",
            nextStatus: "ENTRY_WEIGHING",
            fields: [],
          }
        : {
            label: "Entrada no patio",
            nextStatus: "YARD",
            fields: [],
          };
    case "ENTRY_WEIGHING":
      return {
        label: "Registrar entrada",
        nextStatus: "YARD",
        fields: ["entryWeight"],
      };
    case "YARD":
      return {
        label: "Enviar para doca",
        nextStatus: "DOCKED",
        fields: ["dock"],
      };
    case "DOCKED":
      return {
        label: "Concluir doca",
        nextStatus: "AWAITING_RELEASE",
        fields: [],
      };
    case "AWAITING_RELEASE":
      return movement.weighingRequired
        ? {
            label: "Enviar pesagem saida",
            nextStatus: "EXIT_WEIGHING",
            fields: [],
          }
        : {
            label: "Liberar saida",
            nextStatus: "RELEASED",
            fields: [],
          };
    case "EXIT_WEIGHING":
      return {
        label: "Liberar saida",
        nextStatus: "RELEASED",
        fields: ["exitWeight"],
      };
    case "RELEASED":
      return {
        label: "Finalizar",
        nextStatus: "FINISHED",
        fields: [],
      };
    default:
      return null;
  }
}

function getExceptionMovementActions(
  movement: YardMovement
): MovementAction[] {
  const actions: MovementAction[] = [];

  if (movement.status === "GATE_CHECK") {
    actions.push({
      label: "Recusar",
      nextStatus: "REJECTED",
      fields: ["statusReason"],
      tone: "danger",
    });
  }

  if (
    [
      "WAITING_QUEUE",
      "GATE_CHECK",
      "ENTRY_WEIGHING",
      "YARD",
      "DOCKED",
      "AWAITING_RELEASE",
      "EXIT_WEIGHING",
    ].includes(movement.status)
  ) {
    actions.push({
      label: "Cancelar",
      nextStatus: "CANCELLED",
      fields: ["statusReason"],
      tone: "danger",
    });
  }

  return actions;
}

function parsePositiveNumber(value: string, label: string): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} deve ser maior que zero.`);
  }
  return parsed;
}

function buildActionPayload(
  movementAction: MovementAction,
  formData: MovementActionFormData
): UpdateYardMovementStatusInput {
  const payload: UpdateYardMovementStatusInput = {
    status: movementAction.nextStatus,
  };

  if (movementAction.fields.includes("entryWeight")) {
    payload.entryWeight = parsePositiveNumber(
      formData.entryWeight,
      "Peso de entrada"
    );
  }

  if (movementAction.fields.includes("exitWeight")) {
    payload.exitWeight = parsePositiveNumber(
      formData.exitWeight,
      "Peso de saida"
    );
  }

  if (movementAction.fields.includes("dock")) {
    const dock = formData.dock.trim();
    if (!dock) {
      throw new Error("Selecione a doca.");
    }
    payload.dock = dock;
  }

  if (movementAction.fields.includes("statusReason")) {
    const statusReason = formData.statusReason.trim();
    if (!statusReason) {
      throw new Error("Informe o motivo da acao.");
    }
    payload.statusReason = statusReason;
  }

  return payload;
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

const Authorizations: React.FC = () => {
  const toast = useToast();
  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    refetch: refetchVehicles,
  } = useVehicles();
  const {
    activeDocks,
    loading: docksLoading,
    error: docksError,
    refetch: refetchDocks,
  } = useDocks();
  const {
    movements,
    loading: movementsLoading,
    error: movementsError,
    openByVehicleId,
    refetch: refetchMovements,
    createAuthorization,
    updateStatus,
  } = useYardMovements();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<AuthorizationFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("abertas");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [detailTarget, setDetailTarget] = useState<YardMovement | null>(null);
  const [actionTarget, setActionTarget] = useState<YardMovement | null>(null);
  const [actionDefinition, setActionDefinition] =
    useState<MovementAction | null>(null);
  const [actionFormData, setActionFormData] =
    useState<MovementActionFormData>(INITIAL_ACTION_FORM);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const availableVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.status === "Ativo" && !openByVehicleId.has(vehicle.id)
      ),
    [vehicles, openByVehicleId]
  );

  const occupiedDockMap = useMemo(() => {
    const map = new Map<string, YardMovement>();
    for (const movement of movements) {
      if (movement.status === "DOCKED" && movement.dock) {
        map.set(movement.dock, movement);
      }
    }
    return map;
  }, [movements]);

  const hasAvailableDock = useMemo(
    () => activeDocks.some((dock) => !occupiedDockMap.has(dock.code)),
    [activeDocks, occupiedDockMap]
  );

  const metrics = useMemo(() => {
    const abertas = movements.filter((movement) =>
      isOpenYardMovement(movement.status)
    ).length;
    const fila = movements.filter(
      (movement) => movement.status === "WAITING_QUEUE"
    ).length;
    const patio = movements.filter(
      (movement) => movement.status === "YARD"
    ).length;
    const doca = movements.filter(
      (movement) => movement.status === "DOCKED"
    ).length;

    return { abertas, fila, patio, doca };
  }, [movements]);

  const filteredMovements = useMemo(
    () =>
      movements.filter((movement) =>
        movementMatchesFilter(
          movement,
          statusFilter,
          searchTerm,
          dateFromFilter,
          dateToFilter,
          reasonFilter
        )
      ),
    [movements, searchTerm, statusFilter, dateFromFilter, dateToFilter, reasonFilter]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === formData.vehicleId),
    [vehicles, formData.vehicleId]
  );

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setFormError(null);
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setShowModal(false);
    resetForm();
  }, [resetForm, submitting]);

  const handleVehicleSelection = useCallback(
    (vehicleId: string) => {
      const vehicle = vehicles.find((item) => item.id === vehicleId);
      setFormData({
        vehicleId,
        motorista: vehicle?.motorista ?? "",
        cpf: vehicle?.cpf ?? "",
        cargoType: "Geral",
        processType: "Carga",
        pesagemObrigatoria: vehicle?.pesagemObrigatoria ?? false,
      });
    },
    [vehicles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (name === "vehicleId") {
        handleVehicleSelection(value);
        return;
      }
      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: checked }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    [handleVehicleSelection]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);

      if (!selectedVehicle) {
        setFormError("Selecione um veiculo ativo para autorizar a entrada.");
        return;
      }

      setSubmitting(true);
      try {
        await createAuthorization({
          vehicleId: selectedVehicle.id,
          driverName: formData.motorista,
          driverCpf: formData.cpf || undefined,
          cargoType: formData.cargoType,
          processType: formData.processType,
          weighingRequired: formData.pesagemObrigatoria,
        });
        setShowModal(false);
        resetForm();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Erro ao criar autorizacao."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [createAuthorization, formData, resetForm, selectedVehicle]
  );

  const resetActionModal = useCallback(() => {
    setActionTarget(null);
    setActionDefinition(null);
    setActionFormData(INITIAL_ACTION_FORM);
    setActionError(null);
  }, []);

  const closeActionModal = useCallback(() => {
    if (actionBusyId) return;
    resetActionModal();
  }, [actionBusyId, resetActionModal]);

  const executeMovementAction = useCallback(
    async (
      movement: YardMovement,
      movementAction: MovementAction,
      actionData: MovementActionFormData
    ) => {
      setActionError(null);

      let payload: UpdateYardMovementStatusInput;
      try {
        payload = buildActionPayload(movementAction, actionData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Dados da acao invalidos.";
        setActionError(message);
        return;
      }

      setActionBusyId(movement.id);
      try {
        await updateStatus(movement.id, payload);
        toast.success({
          title: "Movimentacao atualizada",
          description: `${movement.plateSnapshot} agora esta em ${yardMovementStatusLabel(
            movementAction.nextStatus
          )}.`,
        });
        resetActionModal();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar movimentacao.";
        setActionError(message);
        toast.error({ title: "Nao foi possivel avancar", description: message });
      } finally {
        setActionBusyId(null);
      }
    },
    [resetActionModal, toast, updateStatus]
  );

  const handleStartAction = useCallback(
    (movement: YardMovement, requestedAction?: MovementAction) => {
      const movementAction = requestedAction ?? getNextMovementAction(movement);
      if (!movementAction) return;

      if (movementAction.nextStatus === "DOCKED" && !hasAvailableDock) {
        toast.error("Nao ha docas disponiveis no momento.");
        return;
      }

      if (movementAction.fields.length === 0) {
        void executeMovementAction(
          movement,
          movementAction,
          INITIAL_ACTION_FORM
        );
        return;
      }

      setActionTarget(movement);
      setActionDefinition(movementAction);
      setActionFormData({
        entryWeight:
          movement.entryWeight === undefined ? "" : String(movement.entryWeight),
        exitWeight:
          movement.exitWeight === undefined ? "" : String(movement.exitWeight),
        dock: movement.dock ?? "",
        statusReason: "",
      });
      setActionError(null);
    },
    [executeMovementAction, hasAvailableDock, toast]
  );

  const handleActionInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { name, value } = e.target;
      setActionFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleActionSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!actionTarget || !actionDefinition) return;
      void executeMovementAction(
        actionTarget,
        actionDefinition,
        actionFormData
      );
    },
    [actionDefinition, actionFormData, actionTarget, executeMovementAction]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([refetchVehicles(), refetchMovements(), refetchDocks()]);
  }, [refetchVehicles, refetchMovements, refetchDocks]);

  const loading = vehiclesLoading || movementsLoading || docksLoading;
  const error = vehiclesError ?? movementsError ?? docksError;

  return (
    <div className="authorizations-page">
      <div className="authorizations-page-header">
        <div className="page-title-wrap">
          <h2>Autorizacoes de Entrada</h2>
          <div className="page-subtitle">
            Crie a autorizacao que inicia o fluxo operacional do patio.
          </div>
        </div>
        <div className="authorizations-page-actions">
          <button className="btn btn--secondary" onClick={() => void refreshAll()}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button
            className="btn btn--primary"
            onClick={openModal}
            disabled={availableVehicles.length === 0}
          >
            <Plus size={16} /> Nova Autorizacao
          </button>
        </div>
      </div>

      {error && (
        <div className="status-badge status-badge--danger authorizations-alert" role="alert">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--total">
          <div className="kpi-icon" aria-hidden="true"><ClipboardCheck /></div>
          <div className="kpi-content">
            <h3>Abertas</h3>
            <p className="kpi-value">{metrics.abertas}</p>
            <span>em fluxo operacional</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-icon" aria-hidden="true"><Truck /></div>
          <div className="kpi-content">
            <h3>Fila</h3>
            <p className="kpi-value">{metrics.fila}</p>
            <span>autorizadas para entrada</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-icon" aria-hidden="true"><Truck /></div>
          <div className="kpi-content">
            <h3>Patio</h3>
            <p className="kpi-value">{metrics.patio}</p>
            <span>aguardando doca</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--danger">
          <div className="kpi-icon" aria-hidden="true"><Truck /></div>
          <div className="kpi-content">
            <h3>Doca</h3>
            <p className="kpi-value">{metrics.doca}</p>
            <span>em atendimento</span>
          </div>
        </div>
      </div>

      <div className="authorizations-section">
        <div className="section-header">
          <div className="section-header-meta">
            <h3>Movimentacoes</h3>
            <span className="result-count">
              {filteredMovements.length} de {movements.length}
            </span>
          </div>
          <div className="filters" role="group" aria-label="Filtros">
            <div className="search-input-wrap">
              <Search aria-hidden="true" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Buscar por placa ou motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar autorizacoes"
              />
            </div>
            <input
              type="date"
              className="form-input date-filter"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              aria-label="Data inicial"
            />
            <input
              type="date"
              className="form-input date-filter"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              aria-label="Data final"
            />
            <select
              className="form-input status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por status"
            >
              <option value="abertas">Abertas</option>
              <option value="todos">Todas</option>
              <option value="WAITING_QUEUE">Fila</option>
              <option value="GATE_CHECK">Portaria</option>
              <option value="ENTRY_WEIGHING">Pesagem Entrada</option>
              <option value="YARD">Patio</option>
              <option value="DOCKED">Doca</option>
              <option value="AWAITING_RELEASE">Aguardando Liberacao</option>
              <option value="EXIT_WEIGHING">Pesagem Saida</option>
              <option value="RELEASED">Liberado</option>
              <option value="fechadas">Fechadas</option>
            </select>
            <input
              type="text"
              className="form-input reason-filter"
              placeholder="Motivo..."
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              aria-label="Filtrar por motivo"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="veiculos-table authorizations-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Status</th>
                <th>Motorista</th>
                <th>Processo</th>
                <th>Carga</th>
                <th>Chegada</th>
                <th>Motivo</th>
                <th>Pesagem</th>
                <th>Doca</th>
                <th>Peso Entrada</th>
                <th>Peso Saida</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state">
                      <div className="empty-state-illus"><Truck /></div>
                      <h4>Carregando autorizacoes...</h4>
                      <p>Buscando movimentacoes e veiculos disponiveis.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state">
                      <div className="empty-state-illus"><ClipboardCheck /></div>
                      <h4>Nenhuma autorizacao encontrada</h4>
                      <p>Crie uma autorizacao para iniciar o fluxo de entrada no patio.</p>
                      <button
                        className="btn btn--primary"
                        onClick={openModal}
                        disabled={availableVehicles.length === 0}
                      >
                        <Plus size={16} /> Nova Autorizacao
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const label = yardMovementStatusLabel(movement.status);
                  const movementAction = getNextMovementAction(movement);
                  const exceptionActions =
                    getExceptionMovementActions(movement);
                  const hasAnyAction =
                    movementAction !== null || exceptionActions.length > 0;
                  const isActionBusy = actionBusyId === movement.id;
                  const isDockBlocked =
                    movementAction?.nextStatus === "DOCKED" &&
                    !hasAvailableDock;
                  return (
                    <tr key={movement.id}>
                      <td><span className="placa">{movement.plateSnapshot}</span></td>
                      <td>
                        <span className={`status-badge status-badge--${statusToVariant(label)} status-${statusToSlug(label)}`}>
                          {label}
                        </span>
                      </td>
                      <td>
                        <div className="driver-cell">
                          <div className="driver-name">{movement.driverName}</div>
                        </div>
                      </td>
                      <td>{movement.processType ?? "-"}</td>
                      <td>{movement.cargoType}</td>
                      <td>{formatDate(movement.arrivalDate)}</td>
                      <td className="status-reason-cell">
                        {movement.statusReason ?? "-"}
                      </td>
                      <td>
                        {movement.weighingRequired ? (
                          <span className="status-badge status-badge--warning">
                            <Scale /> Obrigatoria
                          </span>
                        ) : (
                          <span className="pesagem-off">-</span>
                        )}
                      </td>
                      <td>{movement.dock ?? "-"}</td>
                      <td>{formatWeight(movement.entryWeight)}</td>
                      <td>{formatWeight(movement.exitWeight)}</td>
                      <td>
                        <div className="movement-actions">
                          <button
                            type="button"
                            className="btn btn--secondary btn--table-action"
                            onClick={() => setDetailTarget(movement)}
                          >
                            <Eye size={14} /> Detalhes
                          </button>
                          {movementAction && (
                            <button
                              type="button"
                              className="btn btn--secondary btn--table-action"
                              onClick={() => handleStartAction(movement)}
                              disabled={Boolean(actionBusyId) || isDockBlocked}
                            >
                              {isActionBusy
                                ? "Atualizando..."
                                : isDockBlocked
                                  ? "Sem doca livre"
                                  : movementAction.label}
                              {!isActionBusy && !isDockBlocked && (
                                <ArrowRight size={14} />
                              )}
                            </button>
                          )}
                          {exceptionActions.map((exceptionAction) => (
                            <button
                              key={exceptionAction.nextStatus}
                              type="button"
                              className="btn btn--danger btn--table-action"
                              onClick={() =>
                                handleStartAction(movement, exceptionAction)
                              }
                              disabled={Boolean(actionBusyId)}
                            >
                              {isActionBusy
                                ? "Atualizando..."
                                : exceptionAction.label}
                            </button>
                          ))}
                          {!hasAnyAction && (
                            <span className="status-badge status-badge--neutral">
                              Sem acao
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-authorization-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-authorization-title">Nova Autorizacao de Entrada</h3>
              <button
                className="btn btn--icon modal-close"
                onClick={closeModal}
                aria-label="Fechar modal"
                disabled={submitting}
              >
                <X />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              {formError && (
                <div className="status-badge status-badge--danger authorizations-alert" role="alert">
                  {formError}
                </div>
              )}

              <div className="form-grid">
                <div className="form-field form-field-full">
                  <label htmlFor="authorization-vehicle">Veiculo</label>
                  <select
                    id="authorization-vehicle"
                    name="vehicleId"
                    className="form-input"
                    value={formData.vehicleId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione um veiculo ativo</option>
                    {availableVehicles.map((vehicle: Veiculo) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.placa} - {vehicle.motorista}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="authorization-driver">Motorista</label>
                  <input
                    id="authorization-driver"
                    name="motorista"
                    className="form-input"
                    value={formData.motorista}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="authorization-cpf">CPF</label>
                  <input
                    id="authorization-cpf"
                    name="cpf"
                    className="form-input"
                    value={formData.cpf}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="authorization-cargo">Tipo de Carga</label>
                  <select
                    id="authorization-cargo"
                    name="cargoType"
                    className="form-input"
                    value={formData.cargoType}
                    onChange={handleInputChange}
                  >
                    {TIPOS_CARGA.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="authorization-process">Tipo de Processo</label>
                  <select
                    id="authorization-process"
                    name="processType"
                    className="form-input"
                    value={formData.processType}
                    onChange={handleInputChange}
                  >
                    {TIPOS_PROCESSO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field form-field-checkbox">
                  <label htmlFor="authorization-weighing">
                    <input
                      id="authorization-weighing"
                      name="pesagemObrigatoria"
                      type="checkbox"
                      checked={formData.pesagemObrigatoria}
                      onChange={handleInputChange}
                    />
                    <span>
                      Pesagem Obrigatoria
                      <span className="helper">A movimentacao passara pelas etapas de pesagem.</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar Autorizacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div
            className="modal-card modal-card--detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-movement-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-movement-detail-title">
                Movimentacao - {detailTarget.plateSnapshot}
              </h3>
              <button
                className="btn btn--icon modal-close"
                onClick={() => setDetailTarget(null)}
                aria-label="Fechar detalhes"
              >
                <X />
              </button>
            </div>

            <div className="modal-form">
              <div className="movement-detail-summary">
                <span className="placa">{detailTarget.plateSnapshot}</span>
                <span>{detailTarget.driverName}</span>
                <span
                  className={`status-badge status-badge--${statusToVariant(
                    yardMovementStatusLabel(detailTarget.status)
                  )}`}
                >
                  {yardMovementStatusLabel(detailTarget.status)}
                </span>
              </div>

              <div className="movement-detail-grid">
                <div>
                  <span>Criado por</span>
                  <strong>{detailTarget.createdBy ?? "-"}</strong>
                </div>
                <div>
                  <span>Liberado por</span>
                  <strong>{detailTarget.releasedBy ?? "-"}</strong>
                </div>
                <div>
                  <span>Cancelado por</span>
                  <strong>{detailTarget.cancelledBy ?? "-"}</strong>
                </div>
                <div>
                  <span>Chegada</span>
                  <strong>{formatDate(detailTarget.arrivalDate)}</strong>
                </div>
                <div>
                  <span>Doca</span>
                  <strong>{detailTarget.dock ?? "-"}</strong>
                </div>
                <div>
                  <span>Motivo</span>
                  <strong>{detailTarget.statusReason ?? "-"}</strong>
                </div>
              </div>

              <div className="timeline">
                <h4>Linha do tempo</h4>
                {getTimelineEvents(detailTarget).map((event, index) => {
                  const details = getTimelineDetails(event);
                  return (
                    <div
                      className="timeline-item"
                      key={`${event.createdAt}-${index}`}
                    >
                      <div className="timeline-marker" aria-hidden="true" />
                      <div className="timeline-content">
                        <div className="timeline-heading">
                          <strong>{getTimelineTitle(event)}</strong>
                          <span>{formatDate(event.createdAt)}</span>
                        </div>
                        <div className="timeline-meta">
                          <span>Usuario: {event.createdBy ?? "-"}</span>
                          <span>
                            Status: {yardMovementStatusLabel(event.toStatus)}
                          </span>
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
            </div>
          </div>
        </div>
      )}

      {actionTarget && actionDefinition && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div
            className="modal-card modal-card--action"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-movement-action-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-movement-action-title">{actionDefinition.label}</h3>
              <button
                className="btn btn--icon modal-close"
                onClick={closeActionModal}
                aria-label="Fechar modal"
                disabled={Boolean(actionBusyId)}
              >
                <X />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleActionSubmit}>
              <div className="action-summary">
                <span className="placa">{actionTarget.plateSnapshot}</span>
                <span>{actionTarget.driverName}</span>
                <span className="action-flow">
                  {yardMovementStatusLabel(actionTarget.status)}
                  <ArrowRight size={14} />
                  {yardMovementStatusLabel(actionDefinition.nextStatus)}
                </span>
              </div>

              {actionError && (
                <div className="status-badge status-badge--danger authorizations-alert" role="alert">
                  {actionError}
                </div>
              )}

              <div className="form-grid action-form-grid">
                {actionDefinition.fields.includes("entryWeight") && (
                  <div className="form-field form-field-full">
                    <label htmlFor="movement-entry-weight">Peso de Entrada</label>
                    <input
                      id="movement-entry-weight"
                      name="entryWeight"
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      value={actionFormData.entryWeight}
                      onChange={handleActionInputChange}
                      required
                    />
                  </div>
                )}

                {actionDefinition.fields.includes("dock") && (
                  <div className="form-field form-field-full">
                    <label htmlFor="movement-dock">Doca</label>
                    <select
                      id="movement-dock"
                      name="dock"
                      className="form-input"
                      value={actionFormData.dock}
                      onChange={handleActionInputChange}
                      required
                    >
                      <option value="">Selecione a doca</option>
                      {activeDocks.map((dock) => {
                        const occupant = occupiedDockMap.get(dock.code);
                        const isOccupiedByOther =
                          occupant !== undefined &&
                          occupant.id !== actionTarget.id;
                        const optionLabel = isOccupiedByOther && occupant
                          ? `${dock.code} - ocupada por ${occupant.plateSnapshot}`
                          : dock.name
                            ? `${dock.code} - ${dock.name}`
                            : dock.code;

                        return (
                          <option
                            key={dock.id}
                            value={dock.code}
                            disabled={isOccupiedByOther}
                          >
                            {optionLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {actionDefinition.fields.includes("exitWeight") && (
                  <div className="form-field">
                    <label htmlFor="movement-exit-weight">Peso de Saida</label>
                    <input
                      id="movement-exit-weight"
                      name="exitWeight"
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      value={actionFormData.exitWeight}
                      onChange={handleActionInputChange}
                      required
                    />
                  </div>
                )}

                {actionDefinition.fields.includes("statusReason") && (
                  <div className="form-field form-field-full">
                    <label htmlFor="movement-status-reason">Motivo</label>
                    <textarea
                      id="movement-status-reason"
                      name="statusReason"
                      className="form-input status-reason-input"
                      value={actionFormData.statusReason}
                      onChange={handleActionInputChange}
                      minLength={3}
                      maxLength={500}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeActionModal}
                  disabled={Boolean(actionBusyId)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={Boolean(actionBusyId)}
                >
                  {actionBusyId ? "Atualizando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authorizations;
