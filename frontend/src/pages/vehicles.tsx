import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Power,
  Trash2,
  Plus,
  Search,
  Scale,
  Truck,
  CheckCircle2,
  Ban,
  AlertTriangle,
  ClipboardCheck,
  X,
} from "lucide-react";
import "./vehicles.css";
import {
  useVehicles,
  type TipoVeiculo,
  type Veiculo,
  type VeiculoFormData,
} from "../hooks/useVehicles";
import { useYardMovements } from "../hooks/useYardMovements";
import { yardMovementStatusLabel } from "../services/yardMovements";

const INITIAL_FORM: VeiculoFormData = {
  placa: "",
  cor: "",
  motorista: "",
  cpf: "",
  tipo: "Truck",
  pesagemObrigatoria: false,
  status: "Ativo",
};

interface AuthorizationFormData {
  motorista: string;
  cpf: string;
  cargoType: string;
  processType: string;
  pesagemObrigatoria: boolean;
}

const TIPOS_VEICULO: TipoVeiculo[] = [
  "Truck",
  "Van",
  "Carreta",
  "Toco",
  "Bitrem",
  "VUC",
];

const TIPOS_PROCESSO = ["Carga", "Descarga", "Carga/Descarga", "Aguardando"];
const TIPOS_CARGA = ["Geral", "Alimentos", "Bebidas", "Quimicos", "Secos", "Refrigerados"];

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const Veiculos: React.FC = () => {
  const { vehicles, loading, error, refetch, create, toggleStatus, remove } =
    useVehicles();
  const {
    loading: movementsLoading,
    error: movementError,
    openByVehicleId,
    createAuthorization,
  } = useYardMovements();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VeiculoFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Veiculo | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [authorizationTarget, setAuthorizationTarget] = useState<Veiculo | null>(null);
  const [authorizationForm, setAuthorizationForm] = useState<AuthorizationFormData>({
    motorista: "",
    cpf: "",
    cargoType: "Geral",
    processType: "Carga",
    pesagemObrigatoria: false,
  });
  const [authorizing, setAuthorizing] = useState<boolean>(false);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);

  const [rowLoading, setRowLoading] = useState<Record<string, "toggle" | "delete" | "authorize" | undefined>>({});

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [pesagemFilter, setPesagemFilter] = useState<string>("todos");

  const triggerRef = useRef<HTMLElement | null>(null);

  const totalVeiculos = vehicles.length;
  const veiculosAtivos = useMemo(
    () => vehicles.filter((v) => v.status === "Ativo").length,
    [vehicles]
  );
  const veiculosInativos = useMemo(
    () => vehicles.filter((v) => v.status === "Inativo").length,
    [vehicles]
  );
  const veiculosPesagem = useMemo(
    () => vehicles.filter((v) => v.pesagemObrigatoria).length,
    [vehicles]
  );

  const filteredVeiculos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchSearch =
        term === "" ||
        v.placa.toLowerCase().includes(term) ||
        v.motorista.toLowerCase().includes(term);
      const matchStatus =
        statusFilter === "todos" || v.status.toLowerCase() === statusFilter;
      const matchPesagem =
        pesagemFilter === "todos" ||
        (pesagemFilter === "sim" && v.pesagemObrigatoria) ||
        (pesagemFilter === "nao" && !v.pesagemObrigatoria);
      return matchSearch && matchStatus && matchPesagem;
    });
  }, [vehicles, searchTerm, statusFilter, pesagemFilter]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("todos");
    setPesagemFilter("todos");
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
  }, []);

  const openNewModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((veiculo: Veiculo) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setEditingId(veiculo.id);
    setFormData({
      placa: veiculo.placa,
      cor: veiculo.cor,
      motorista: veiculo.motorista,
      cpf: veiculo.cpf,
      tipo: veiculo.tipo,
      pesagemObrigatoria: veiculo.pesagemObrigatoria,
      status: veiculo.status,
    });
    setFormError(null);
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    document.getElementById("placa")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [showModal, closeModal]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        e.preventDefault();
        setDeleteTarget(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, deleting]);

  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: checked }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    []
  );

  const handleAuthorizationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setAuthorizationForm((prev) => ({ ...prev, [name]: checked }));
      } else {
        setAuthorizationForm((prev) => ({ ...prev, [name]: value }));
      }
    },
    []
  );

  const openAuthorizationModal = useCallback((veiculo: Veiculo) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setAuthorizationTarget(veiculo);
    setAuthorizationError(null);
    setAuthorizationForm({
      motorista: veiculo.motorista,
      cpf: veiculo.cpf,
      cargoType: "Geral",
      processType: "Carga",
      pesagemObrigatoria: veiculo.pesagemObrigatoria,
    });
  }, []);

  const closeAuthorizationModal = useCallback(() => {
    setAuthorizationTarget(null);
    setAuthorizationError(null);
    setAuthorizing(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      setSubmitting(true);
      try {
        if (editingId !== null) {
          setFormError(
            "Edição ainda não suportada pelo backend. Use os botões de status/excluir."
          );
          return;
        }
        await create(formData);
        closeModal();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        setSubmitting(false);
      }
    },
    [editingId, formData, create, closeModal]
  );

  const handleAuthorizationSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!authorizationTarget) return;

      setAuthorizationError(null);
      setAuthorizing(true);
      setRowLoading((prev) => ({
        ...prev,
        [authorizationTarget.id]: "authorize",
      }));

      try {
        await createAuthorization({
          vehicleId: authorizationTarget.id,
          driverName: authorizationForm.motorista,
          driverCpf: authorizationForm.cpf || undefined,
          cargoType: authorizationForm.cargoType,
          processType: authorizationForm.processType,
          weighingRequired: authorizationForm.pesagemObrigatoria,
        });
        closeAuthorizationModal();
      } catch (err) {
        setAuthorizationError(
          err instanceof Error ? err.message : "Erro ao autorizar entrada."
        );
      } finally {
        setAuthorizing(false);
        setRowLoading((prev) => {
          const next = { ...prev };
          delete next[authorizationTarget.id];
          return next;
        });
      }
    },
    [
      authorizationTarget,
      authorizationForm,
      createAuthorization,
      closeAuthorizationModal,
    ]
  );

  const handleToggleStatus = useCallback(
    async (id: string) => {
      setRowLoading((prev) => ({ ...prev, [id]: "toggle" }));
      try {
        await toggleStatus(id);
      } catch {
        /* erro já está em `error` */
      } finally {
        setRowLoading((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [toggleStatus]
  );

  const askDelete = useCallback((v: Veiculo) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setDeleteTarget(v);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleting(true);
    setRowLoading((prev) => ({ ...prev, [id]: "delete" }));
    try {
      await remove(id);
      setDeleteTarget(null);
    } catch {
      /* erro já está em `error` */
    } finally {
      setDeleting(false);
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [deleteTarget, remove]);

  const renderTableBody = () => {
    if (loading || movementsLoading) {
      return (
        <tr>
          <td colSpan={9} role="status" aria-live="polite">
            <div className="empty-state">
              <div className="empty-state-illus"><Truck /></div>
              <h4>Carregando veículos…</h4>
              <p>Buscando a frota disponível para operação.</p>
            </div>
          </td>
        </tr>
      );
    }

    if ((error || movementError) && vehicles.length === 0) {
      return (
        <tr>
          <td colSpan={9} role="alert">
            <div className="empty-state">
              <div className="empty-state-illus" style={{ background: "var(--color-danger-50)", color: "var(--color-danger-600)" }}>
                <AlertTriangle />
              </div>
              <h4>Não foi possível carregar os veículos</h4>
              <p>{error ?? movementError}</p>
              <button type="button" className="btn btn--secondary" onClick={() => void refetch()}>
                Tentar novamente
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (filteredVeiculos.length === 0) {
      const isEmpty = vehicles.length === 0;
      return (
        <tr>
          <td colSpan={9} role="status">
            <div className="empty-state">
              <div className="empty-state-illus"><Truck /></div>
              <h4>{isEmpty ? "Nenhum veículo cadastrado ainda" : "Nenhum veículo encontrado"}</h4>
              <p>
                {isEmpty
                  ? "Comece cadastrando o primeiro veículo da sua frota para liberar operações no pátio."
                  : "Nenhum resultado bate com os filtros aplicados. Tente limpar a busca ou revisar os filtros."}
              </p>
              {isEmpty ? (
                <button className="btn btn--primary" onClick={openNewModal}>
                  <Plus size={16} /> Cadastrar primeiro veículo
                </button>
              ) : (
                <button className="btn btn--secondary" onClick={clearFilters}>
                  Limpar filtros
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    }

    return filteredVeiculos.map((v) => {
      const inactive = v.status !== "Ativo";
      const rowBusy = rowLoading[v.id];
      const openMovement = openByVehicleId.get(v.id);
      const canAuthorize = !inactive && !openMovement && !movementsLoading;
      return (
        <tr key={v.id} className={inactive ? "row--inactive" : undefined}>
          <td><span className="placa">{v.placa}</span></td>
          <td>{v.cor || <span className="muted">—</span>}</td>
          <td>
            <div className="driver-cell">
              <div className="driver-avatar" aria-hidden="true">{getInitials(v.motorista)}</div>
              <div className="driver-name">{v.motorista}</div>
            </div>
          </td>
          <td><span className="cpf-cell">{v.cpf || "—"}</span></td>
          <td>{v.tipo}</td>
          <td>
            {v.pesagemObrigatoria ? (
              <span className="status-badge status-badge--warning">
                <Scale /> Obrigatória
              </span>
            ) : (
              <span className="pesagem-off" aria-label="Sem pesagem obrigatória">—</span>
            )}
          </td>
          <td>
            {inactive ? (
              <span className="status-badge status-badge--neutral">
                <Ban /> Inativo
              </span>
            ) : (
              <span className="status-badge status-badge--success">
                <span className="status-dot" aria-hidden="true" />
                Ativo
              </span>
            )}
          </td>
          <td>
            {openMovement ? (
              <span className="status-badge status-badge--info">
                <ClipboardCheck /> {yardMovementStatusLabel(openMovement.status)}
              </span>
            ) : (
              <span className="status-badge status-badge--neutral">
                Sem autorizacao
              </span>
            )}
          </td>
          <td>
            <div className="row-actions">
              <button
                className={`btn btn--icon ${rowBusy === "authorize" ? "is-loading" : ""}`}
                title="Autorizar entrada"
                aria-label={`Autorizar entrada do veiculo ${v.placa}`}
                onClick={() => openAuthorizationModal(v)}
                disabled={!!rowBusy || !canAuthorize}
              >
                <ClipboardCheck />
              </button>
              <button
                className="btn btn--icon"
                title="Editar"
                aria-label={`Editar veículo ${v.placa}`}
                onClick={() => openEditModal(v)}
                disabled={!!rowBusy}
              >
                <Pencil />
              </button>
              <button
                className={`btn btn--icon ${rowBusy === "toggle" ? "is-loading" : ""}`}
                title={v.status === "Ativo" ? "Desativar" : "Ativar"}
                aria-label={`${v.status === "Ativo" ? "Desativar" : "Ativar"} veículo ${v.placa}`}
                onClick={() => void handleToggleStatus(v.id)}
                disabled={!!rowBusy}
              >
                <Power />
              </button>
              <span className="row-actions-divider" aria-hidden="true" />
              <button
                className={`btn btn--icon btn--icon-danger ${rowBusy === "delete" ? "is-loading" : ""}`}
                title="Excluir"
                aria-label={`Excluir veículo ${v.placa}`}
                onClick={() => askDelete(v)}
                disabled={!!rowBusy}
              >
                <Trash2 />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="veiculos-page">
      <div className="veiculos-page-header">
        <div className="page-title-wrap">
          <h2>Cadastro de Veículos</h2>
          <div className="page-subtitle">Frota disponível para operação no pátio.</div>
        </div>
        <button className="btn btn--primary" onClick={openNewModal}>
          <Plus size={16} /> Novo Veículo
        </button>
      </div>

      {(error || movementError) && vehicles.length > 0 && (
        <div className="status-badge status-badge--danger" role="alert" style={{ marginBottom: "1rem" }}>
          {error ?? movementError}
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--total">
          <div className="kpi-icon" aria-hidden="true"><Truck /></div>
          <div className="kpi-content">
            <h3>Total</h3>
            <p className="kpi-value">{totalVeiculos}</p>
            <span>cadastrados no sistema</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--success">
          <div className="kpi-icon" aria-hidden="true"><CheckCircle2 /></div>
          <div className="kpi-content">
            <h3>Ativos</h3>
            <p className="kpi-value">{veiculosAtivos}</p>
            <span>disponíveis para operação</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-icon" aria-hidden="true"><Scale /></div>
          <div className="kpi-content">
            <h3>Pesagem Obrig.</h3>
            <p className="kpi-value">{veiculosPesagem}</p>
            <span>com regra de pesagem</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--danger">
          <div className="kpi-icon" aria-hidden="true"><Ban /></div>
          <div className="kpi-content">
            <h3>Inativos</h3>
            <p className="kpi-value">{veiculosInativos}</p>
            <span>fora de operação</span>
          </div>
        </div>
      </div>

      <div className="veiculos-section">
        <div className="section-header">
          <div className="section-header-meta">
            <h3>Lista de Veículos</h3>
            <span className="result-count">
              {filteredVeiculos.length} de {vehicles.length}
            </span>
          </div>
          <div className="filters" role="group" aria-label="Filtros">
            <div className="search-input-wrap">
              <Search aria-hidden="true" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Buscar por placa ou motorista..."
                aria-label="Buscar veículos por placa ou motorista"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="form-input status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            <select
              className="form-input status-filter"
              value={pesagemFilter}
              onChange={(e) => setPesagemFilter(e.target.value)}
              aria-label="Filtrar por pesagem obrigatória"
            >
              <option value="todos">Toda Pesagem</option>
              <option value="sim">Pesagem: Sim</option>
              <option value="nao">Pesagem: Não</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="veiculos-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Cor</th>
                <th>Motorista</th>
                <th>CPF</th>
                <th>Tipo</th>
                <th>Pesagem</th>
                <th>Status</th>
                <th>Entrada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-veiculo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-veiculo-title">
                {editingId !== null ? "Editar Veículo" : "Novo Veículo"}
              </h3>
              <button className="btn btn--icon modal-close" onClick={closeModal} aria-label="Fechar modal">
                <X />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              {formError && (
                <div className="status-badge status-badge--danger" role="alert" style={{ marginBottom: "1rem" }}>
                  {formError}
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="placa">Placa</label>
                  <input id="placa" name="placa" type="text" className="form-input"
                    value={formData.placa} onChange={handleFormChange} placeholder="AAA-0000" required />
                </div>
                <div className="form-field">
                  <label htmlFor="cor">Cor</label>
                  <input id="cor" name="cor" type="text" className="form-input"
                    value={formData.cor} onChange={handleFormChange} placeholder="Ex: Branco" required />
                </div>
                <div className="form-field">
                  <label htmlFor="motorista">Nome do Motorista</label>
                  <input id="motorista" name="motorista" type="text" className="form-input"
                    value={formData.motorista} onChange={handleFormChange} placeholder="Nome completo" required />
                </div>
                <div className="form-field">
                  <label htmlFor="cpf">CPF</label>
                  <input id="cpf" name="cpf" type="text" className="form-input"
                    value={formData.cpf} onChange={handleFormChange} placeholder="000.000.000-00" required />
                </div>
                <div className="form-field">
                  <label htmlFor="tipo">Tipo de Veículo</label>
                  <select id="tipo" name="tipo" className="form-input"
                    value={formData.tipo} onChange={handleFormChange}>
                    {TIPOS_VEICULO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" className="form-input"
                    value={formData.status} onChange={handleFormChange}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="form-field form-field-checkbox">
                  <label htmlFor="pesagemObrigatoria">
                    <input
                      id="pesagemObrigatoria"
                      name="pesagemObrigatoria"
                      type="checkbox"
                      checked={formData.pesagemObrigatoria}
                      onChange={handleFormChange}
                    />
                    <span>
                      Pesagem Obrigatória
                      <span className="helper">Exige pesagem na portaria antes da liberação.</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {authorizationTarget && (
        <div className="modal-overlay" onClick={closeAuthorizationModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-authorization-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-authorization-title">
                Autorizacao de Entrada - {authorizationTarget.placa}
              </h3>
              <button
                className="btn btn--icon modal-close"
                onClick={closeAuthorizationModal}
                aria-label="Fechar modal"
                disabled={authorizing}
              >
                <X />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleAuthorizationSubmit}>
              {authorizationError && (
                <div className="status-badge status-badge--danger" role="alert" style={{ marginBottom: "1rem" }}>
                  {authorizationError}
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="authorization-motorista">Motorista</label>
                  <input
                    id="authorization-motorista"
                    name="motorista"
                    type="text"
                    className="form-input"
                    value={authorizationForm.motorista}
                    onChange={handleAuthorizationChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="authorization-cpf">CPF</label>
                  <input
                    id="authorization-cpf"
                    name="cpf"
                    type="text"
                    className="form-input"
                    value={authorizationForm.cpf}
                    onChange={handleAuthorizationChange}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="authorization-cargo">Tipo de Carga</label>
                  <select
                    id="authorization-cargo"
                    name="cargoType"
                    className="form-input"
                    value={authorizationForm.cargoType}
                    onChange={handleAuthorizationChange}
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
                    value={authorizationForm.processType}
                    onChange={handleAuthorizationChange}
                  >
                    {TIPOS_PROCESSO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field form-field-checkbox">
                  <label htmlFor="authorization-pesagem">
                    <input
                      id="authorization-pesagem"
                      name="pesagemObrigatoria"
                      type="checkbox"
                      checked={authorizationForm.pesagemObrigatoria}
                      onChange={handleAuthorizationChange}
                    />
                    <span>
                      Pesagem Obrigatoria
                      <span className="helper">A movimentacao passara pelas etapas de pesagem.</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={closeAuthorizationModal} disabled={authorizing}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={authorizing}>
                  {authorizing ? "Autorizando..." : "Criar Autorizacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal-card modal-card--confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="confirm-delete-title">
                <span className="confirm-icon"><AlertTriangle /></span>
                Excluir veículo?
              </h3>
              <button
                className="btn btn--icon modal-close"
                onClick={() => setDeleteTarget(null)}
                aria-label="Fechar"
                disabled={deleting}
              >
                <X />
              </button>
            </div>
            <div className="modal-form">
              <p className="confirm-body">
                Você vai excluir o veículo <span className="placa">{deleteTarget.placa}</span>{" "}
                de <strong>{deleteTarget.motorista}</strong>. Essa ação é permanente e não pode
                ser desfeita. Deseja continuar?
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--danger" onClick={() => void confirmDelete()} disabled={deleting}>
                  <Trash2 size={16} />
                  {deleting ? "Excluindo..." : "Excluir definitivamente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export type { StatusVeiculo, TipoVeiculo } from "../hooks/useVehicles";
export default Veiculos;
