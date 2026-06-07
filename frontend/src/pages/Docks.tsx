import React, { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { useDocks } from "../hooks/useDocks";
import {
  dockStatusLabel,
  type Dock,
  type DockStatus,
} from "../services/docks";
import "./vehicles.css";
import "./Docks.css";

interface DockFormData {
  code: string;
  name: string;
  status: DockStatus;
  maintenanceReason: string;
}

const INITIAL_FORM: DockFormData = {
  code: "",
  name: "",
  status: "ACTIVE",
  maintenanceReason: "",
};

const statusTone: Record<DockStatus, "success" | "neutral" | "warning"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  MAINTENANCE: "warning",
};

function toPayload(form: DockFormData) {
  return {
    code: form.code.trim(),
    name: form.name.trim() || undefined,
    status: form.status,
    maintenanceReason:
      form.status === "MAINTENANCE"
        ? form.maintenanceReason.trim() || undefined
        : undefined,
  };
}

const Docks: React.FC = () => {
  const { isAdmin } = useAuth();
  const { docks, loading, error, create, update, remove } = useDocks();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDock, setEditingDock] = useState<Dock | null>(null);
  const [formData, setFormData] = useState<DockFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Dock | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const metrics = useMemo(() => {
    const active = docks.filter((dock) => dock.status === "ACTIVE").length;
    const maintenance = docks.filter(
      (dock) => dock.status === "MAINTENANCE"
    ).length;
    const inactive = docks.filter((dock) => dock.status === "INACTIVE").length;
    return { total: docks.length, active, maintenance, inactive };
  }, [docks]);

  const filteredDocks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return docks.filter((dock) => {
      const matchesTerm =
        term.length === 0 ||
        dock.code.toLowerCase().includes(term) ||
        (dock.name ?? "").toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "todos" || dock.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [docks, searchTerm, statusFilter]);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setShowModal(false);
    setEditingDock(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
  }, [submitting]);

  const openCreateModal = useCallback(() => {
    setEditingDock(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((dock: Dock) => {
    setEditingDock(dock);
    setFormData({
      code: dock.code,
      name: dock.name ?? "",
      status: dock.status,
      maintenanceReason: dock.maintenanceReason ?? "",
    });
    setFormError(null);
    setShowModal(true);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.code.trim()) {
        setFormError("Informe o codigo da doca.");
        return;
      }

      setSubmitting(true);
      try {
        if (editingDock) {
          await update(editingDock.id, toPayload(formData));
        } else {
          await create(toPayload(formData));
        }
        closeModal();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erro ao salvar doca.");
      } finally {
        setSubmitting(false);
      }
    },
    [closeModal, create, editingDock, formData, update]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* hook exposes the error */
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, remove]);

  return (
    <div className="veiculos-page docks-page">
      <div className="veiculos-page-header">
        <div className="page-title-wrap">
          <h2>Cadastro de Docas</h2>
          <div className="page-subtitle">
            Mantenha as docas disponiveis para o fluxo do patio.
          </div>
        </div>
        <button className="btn btn--primary" onClick={openCreateModal}>
          <Plus size={16} /> Nova Doca
        </button>
      </div>

      {error && (
        <div className="status-badge status-badge--danger docks-alert" role="alert">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--total">
          <div className="kpi-icon" aria-hidden="true"><Wrench /></div>
          <div className="kpi-content">
            <h3>Total</h3>
            <p className="kpi-value">{metrics.total}</p>
            <span>docas cadastradas</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-icon" aria-hidden="true"><CheckCircle2 /></div>
          <div className="kpi-content">
            <h3>Ativas</h3>
            <p className="kpi-value">{metrics.active}</p>
            <span>liberadas para operacao</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-icon" aria-hidden="true"><Wrench /></div>
          <div className="kpi-content">
            <h3>Manutencao</h3>
            <p className="kpi-value">{metrics.maintenance}</p>
            <span>bloqueadas temporariamente</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--danger">
          <div className="kpi-icon" aria-hidden="true"><Ban /></div>
          <div className="kpi-content">
            <h3>Inativas</h3>
            <p className="kpi-value">{metrics.inactive}</p>
            <span>fora de uso</span>
          </div>
        </div>
      </div>

      <div className="veiculos-section">
        <div className="section-header">
          <div className="section-header-meta">
            <h3>Lista de Docas</h3>
            <span className="result-count">
              {filteredDocks.length} de {docks.length}
            </span>
          </div>
          <div className="filters" role="group" aria-label="Filtros">
            <div className="search-input-wrap">
              <Search aria-hidden="true" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Buscar por codigo ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar docas"
              />
            </div>
            <select
              className="form-input status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar docas por status"
            >
              <option value="todos">Todos os Status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="MAINTENANCE">Manutencao</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="veiculos-table docks-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Motivo manutencao</th>
                <th>Atualizada em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-illus"><Wrench /></div>
                      <h4>Carregando docas...</h4>
                      <p>Buscando cadastro operacional de docas.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDocks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-illus"><Wrench /></div>
                      <h4>Nenhuma doca encontrada</h4>
                      <p>Cadastre uma doca para liberar o envio de veiculos.</p>
                      <button className="btn btn--primary" onClick={openCreateModal}>
                        <Plus size={16} /> Nova Doca
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocks.map((dock) => (
                  <tr key={dock.id}>
                    <td><span className="placa">{dock.code}</span></td>
                    <td>{dock.name || "-"}</td>
                    <td>
                      <span className={`status-badge status-badge--${statusTone[dock.status]}`}>
                        {dockStatusLabel(dock.status)}
                      </span>
                    </td>
                    <td className="dock-reason-cell">
                      {dock.maintenanceReason ?? "-"}
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(dock.updatedAt))}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn--icon"
                          title="Editar"
                          aria-label={`Editar doca ${dock.code}`}
                          onClick={() => openEditModal(dock)}
                        >
                          <Pencil />
                        </button>
                        {isAdmin && (
                          <>
                            <span className="row-actions-divider" aria-hidden="true" />
                            <button
                              className="btn btn--icon btn--icon-danger"
                              title="Excluir"
                              aria-label={`Excluir doca ${dock.code}`}
                              onClick={() => setDeleteTarget(dock)}
                            >
                              <Trash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
            aria-labelledby="modal-dock-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-dock-title">
                {editingDock ? "Editar Doca" : "Nova Doca"}
              </h3>
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
                <div className="status-badge status-badge--danger docks-alert" role="alert">
                  {formError}
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="dock-code">Codigo</label>
                  <input
                    id="dock-code"
                    name="code"
                    className="form-input"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Ex: Doca 1"
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="dock-name">Nome</label>
                  <input
                    id="dock-name"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Recebimento"
                  />
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="dock-status">Status</label>
                  <select
                    id="dock-status"
                    name="status"
                    className="form-input"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="MAINTENANCE">Manutencao</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </div>
                {formData.status === "MAINTENANCE" && (
                  <div className="form-field form-field-full">
                    <label htmlFor="dock-maintenance-reason">
                      Motivo da manutencao
                    </label>
                    <textarea
                      id="dock-maintenance-reason"
                      name="maintenanceReason"
                      className="form-input dock-maintenance-input"
                      value={formData.maintenanceReason}
                      onChange={handleInputChange}
                      maxLength={500}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="modal-card modal-card--confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-dock-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="confirm-delete-dock-title">
                <span className="confirm-icon"><AlertTriangle /></span>
                Excluir doca?
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
                Voce vai excluir a doca <span className="placa">{deleteTarget.code}</span>.
                Essa acao e permanente.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => void confirmDelete()}
                  disabled={deleting}
                >
                  <Trash2 size={16} />
                  {deleting ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Docks;
