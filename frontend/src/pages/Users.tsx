import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Pencil,
  Shield,
  Trash2,
  Plus,
  Search,
  Users as UsersIcon,
  UserCog,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useUsers } from "../hooks/useUsers";
import { useToast } from "../components/Toast";
import { ApiError } from "../services/api";
import type { User, UserRole } from "../services/auth";
import "./Users.css";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  user: "Usuário",
};

const PER_PAGE_OPTIONS = [10, 20, 50] as const;

const createUserSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  email: z.string().email("Email inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra.")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
  role: z.enum(["admin", "user"]),
});

const editUserSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  email: z.string().email("Email inválido."),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || (value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value)),
      "Se preenchida, a senha precisa ter 8+ caracteres com letra e número."
    ),
});

type CreateFormValues = z.infer<typeof createUserSchema>;
type EditFormValues = z.infer<typeof editUserSchema>;

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const Users: React.FC = () => {
  const {
    users,
    total,
    page,
    perPage,
    totalPages,
    loading,
    error,
    search,
    setSearch,
    setPage,
    setPerPage,
    refetch,
    create,
    update,
    changeRole,
    remove,
  } = useUsers();

  const toast = useToast();

  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole>("user");
  const [savingRole, setSavingRole] = useState<boolean>(false);
  const [rowLoading, setRowLoading] = useState<Record<string, "role" | "delete" | undefined>>({});

  const triggerRef = useRef<HTMLElement | null>(null);

  const adminCount = useMemo(() => users.filter((u) => u.role === "admin").length, [users]);
  const userCount = useMemo(() => users.filter((u) => u.role === "user").length, [users]);
  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return users.filter((u) => new Date(u.createdAt).getTime() >= cutoff).length;
  }, [users]);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const closeFormModal = useCallback(() => {
    setShowFormModal(false);
    setEditingUser(null);
    createForm.reset({ name: "", email: "", password: "", role: "user" });
    editForm.reset({ name: "", email: "", password: "" });
  }, [createForm, editForm]);

  const openNewModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setEditingUser(null);
    createForm.reset({ name: "", email: "", password: "", role: "user" });
    setShowFormModal(true);
  }, [createForm]);

  const openEditModal = useCallback(
    (user: User) => {
      triggerRef.current = document.activeElement as HTMLElement | null;
      setEditingUser(user);
      editForm.reset({ name: user.name, email: user.email, password: "" });
      setShowFormModal(true);
    },
    [editForm]
  );

  // Esc fecha o modal de form
  useEffect(() => {
    if (!showFormModal) return;
    const id = editingUser ? "edit-name" : "create-name";
    document.getElementById(id)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeFormModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [showFormModal, editingUser, closeFormModal]);

  // Esc fecha confirm de exclusão
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

  // Esc fecha confirm de role
  useEffect(() => {
    if (!roleTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !savingRole) {
        e.preventDefault();
        setRoleTarget(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [roleTarget, savingRole]);

  const onCreateSubmit = async (values: CreateFormValues): Promise<void> => {
    try {
      await create(values);
      toast.success({ title: "Usuário criado", description: `${values.name} foi adicionado.` });
      closeFormModal();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao criar usuário.";
      if (err instanceof ApiError && err.status === 409) {
        createForm.setError("email", { message: "Este email já está em uso." });
      } else {
        createForm.setError("root.serverError", { message });
      }
    }
  };

  const onEditSubmit = async (values: EditFormValues): Promise<void> => {
    if (!editingUser) return;
    const payload: { name?: string; email?: string; password?: string } = {
      name: values.name,
      email: values.email,
    };
    if (values.password && values.password.length > 0) payload.password = values.password;
    try {
      await update(editingUser.id, payload);
      toast.success({ title: "Usuário atualizado", description: `${values.name} foi salvo.` });
      closeFormModal();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao atualizar usuário.";
      if (err instanceof ApiError && err.status === 409) {
        editForm.setError("email", { message: "Este email já está em uso." });
      } else {
        editForm.setError("root.serverError", { message });
      }
    }
  };

  const askChangeRole = useCallback((user: User) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setRoleTarget(user);
    setPendingRole(user.role === "admin" ? "user" : "admin");
  }, []);

  const confirmChangeRole = useCallback(async () => {
    if (!roleTarget) return;
    const id = roleTarget.id;
    setSavingRole(true);
    setRowLoading((prev) => ({ ...prev, [id]: "role" }));
    try {
      await changeRole(id, pendingRole);
      toast.success({
        title: "Permissão atualizada",
        description: `${roleTarget.name} agora é ${ROLE_LABEL[pendingRole]}.`,
      });
      setRoleTarget(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao atualizar permissão.";
      toast.error({ title: "Não foi possível atualizar", description: message });
    } finally {
      setSavingRole(false);
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [roleTarget, pendingRole, changeRole, toast]);

  const askDelete = useCallback((user: User) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setDeleteTarget(user);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleting(true);
    setRowLoading((prev) => ({ ...prev, [id]: "delete" }));
    try {
      await remove(id);
      toast.success({ title: "Usuário excluído", description: `${deleteTarget.name} foi removido.` });
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao excluir usuário.";
      toast.error({ title: "Não foi possível excluir", description: message });
    } finally {
      setDeleting(false);
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [deleteTarget, remove, toast]);

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} role="status" aria-live="polite">
            <div className="empty-state">
              <div className="empty-state-illus"><UsersIcon /></div>
              <h4>Carregando usuários…</h4>
              <p>Buscando os usuários cadastrados no sistema.</p>
            </div>
          </td>
        </tr>
      );
    }

    if (error && users.length === 0) {
      return (
        <tr>
          <td colSpan={5} role="alert">
            <div className="empty-state">
              <div
                className="empty-state-illus"
                style={{ background: "var(--color-danger-50)", color: "var(--color-danger-600)" }}
              >
                <AlertTriangle />
              </div>
              <h4>Não foi possível carregar os usuários</h4>
              <p>{error}</p>
              <button type="button" className="btn btn--secondary" onClick={() => void refetch()}>
                Tentar novamente
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (users.length === 0) {
      const isEmpty = total === 0 && search === "";
      return (
        <tr>
          <td colSpan={5} role="status">
            <div className="empty-state">
              <div className="empty-state-illus"><UsersIcon /></div>
              <h4>{isEmpty ? "Nenhum usuário cadastrado" : "Nenhum usuário encontrado"}</h4>
              <p>
                {isEmpty
                  ? "Cadastre o primeiro usuário do sistema para liberar o acesso ao painel."
                  : "Nenhum resultado bate com a busca atual. Tente outro termo."}
              </p>
              {isEmpty ? (
                <button className="btn btn--primary" onClick={openNewModal}>
                  <Plus size={16} /> Cadastrar primeiro usuário
                </button>
              ) : (
                <button className="btn btn--secondary" onClick={() => setSearch("")}>
                  Limpar busca
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    }

    return users.map((u) => {
      const rowBusy = rowLoading[u.id];
      return (
        <tr key={u.id}>
          <td>
            <div className="driver-cell">
              <div className="driver-avatar" aria-hidden="true">{getInitials(u.name)}</div>
              <div className="driver-name">{u.name}</div>
            </div>
          </td>
          <td><span className="user-email">{u.email}</span></td>
          <td>
            {u.role === "admin" ? (
              <span className="status-badge status-badge--info">
                <Shield /> {ROLE_LABEL.admin}
              </span>
            ) : (
              <span className="status-badge status-badge--neutral">
                <UserCog /> {ROLE_LABEL.user}
              </span>
            )}
          </td>
          <td><span className="user-date">{formatDate(u.createdAt)}</span></td>
          <td>
            <div className="row-actions">
              <button
                className="btn btn--icon"
                title="Editar"
                aria-label={`Editar usuário ${u.name}`}
                onClick={() => openEditModal(u)}
                disabled={!!rowBusy}
              >
                <Pencil />
              </button>
              <button
                className={`btn btn--icon ${rowBusy === "role" ? "is-loading" : ""}`}
                title="Mudar permissão"
                aria-label={`Mudar permissão de ${u.name}`}
                onClick={() => askChangeRole(u)}
                disabled={!!rowBusy}
              >
                <Shield />
              </button>
              <span className="row-actions-divider" aria-hidden="true" />
              <button
                className={`btn btn--icon btn--icon-danger ${rowBusy === "delete" ? "is-loading" : ""}`}
                title="Excluir"
                aria-label={`Excluir usuário ${u.name}`}
                onClick={() => askDelete(u)}
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
          <h2>Gestão de Usuários</h2>
          <div className="page-subtitle">Controle de acesso e permissões do painel.</div>
        </div>
        <button className="btn btn--primary" onClick={openNewModal}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {error && users.length > 0 && (
        <div className="status-badge status-badge--danger" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--total">
          <div className="kpi-icon" aria-hidden="true"><UsersIcon /></div>
          <div className="kpi-content">
            <h3>Total</h3>
            <p className="kpi-value">{total}</p>
            <span>cadastrados no sistema</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--success">
          <div className="kpi-icon" aria-hidden="true"><Shield /></div>
          <div className="kpi-content">
            <h3>Administradores</h3>
            <p className="kpi-value">{adminCount}</p>
            <span>na página atual</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-icon" aria-hidden="true"><UserCog /></div>
          <div className="kpi-content">
            <h3>Usuários</h3>
            <p className="kpi-value">{userCount}</p>
            <span>na página atual</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--danger">
          <div className="kpi-icon" aria-hidden="true"><CalendarDays /></div>
          <div className="kpi-content">
            <h3>Novos (30d)</h3>
            <p className="kpi-value">{recentCount}</p>
            <span>criados nos últimos 30 dias</span>
          </div>
        </div>
      </div>

      <div className="veiculos-section">
        <div className="section-header">
          <div className="section-header-meta">
            <h3>Lista de Usuários</h3>
            <span className="result-count">
              {users.length} de {total}
            </span>
          </div>
          <div className="filters" role="group" aria-label="Filtros">
            <div className="search-input-wrap">
              <Search aria-hidden="true" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Buscar por nome ou email..."
                aria-label="Buscar usuários"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="veiculos-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Permissão</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination__info">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>
          <div className="pagination__controls">
            <label className="pagination__perpage">
              Por página:
              <select
                className="form-input"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                aria-label="Itens por página"
              >
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <button
              className="btn btn--secondary"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || loading}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || loading}
              aria-label="Próxima página"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showFormModal && !editingUser && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-user-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-user-create-title">Novo Usuário</h3>
              <button className="btn btn--icon modal-close" onClick={closeFormModal} aria-label="Fechar modal">
                <X />
              </button>
            </div>

            <form className="modal-form" onSubmit={createForm.handleSubmit(onCreateSubmit)} noValidate>
              {createForm.formState.errors.root?.serverError && (
                <div className="form-banner form-banner--error" role="alert">
                  <AlertTriangle aria-hidden="true" size={18} />
                  <span>{createForm.formState.errors.root.serverError.message}</span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="create-name">Nome</label>
                  <input
                    id="create-name"
                    type="text"
                    className="form-input"
                    aria-invalid={!!createForm.formState.errors.name}
                    {...createForm.register("name")}
                  />
                  {createForm.formState.errors.name && (
                    <span className="field-error">{createForm.formState.errors.name.message}</span>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="create-email">Email</label>
                  <input
                    id="create-email"
                    type="email"
                    className="form-input"
                    aria-invalid={!!createForm.formState.errors.email}
                    {...createForm.register("email")}
                  />
                  {createForm.formState.errors.email && (
                    <span className="field-error">{createForm.formState.errors.email.message}</span>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="create-password">Senha</label>
                  <input
                    id="create-password"
                    type="password"
                    className="form-input"
                    autoComplete="new-password"
                    aria-invalid={!!createForm.formState.errors.password}
                    {...createForm.register("password")}
                  />
                  {createForm.formState.errors.password && (
                    <span className="field-error">{createForm.formState.errors.password.message}</span>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="create-role">Permissão</label>
                  <select
                    id="create-role"
                    className="form-input"
                    {...createForm.register("role")}
                  >
                    <option value="user">{ROLE_LABEL.user}</option>
                    <option value="admin">{ROLE_LABEL.admin}</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeFormModal}
                  disabled={createForm.formState.isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={createForm.formState.isSubmitting}
                >
                  {createForm.formState.isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormModal && editingUser && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-user-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="modal-user-edit-title">Editar Usuário</h3>
              <button className="btn btn--icon modal-close" onClick={closeFormModal} aria-label="Fechar modal">
                <X />
              </button>
            </div>

            <form className="modal-form" onSubmit={editForm.handleSubmit(onEditSubmit)} noValidate>
              {editForm.formState.errors.root?.serverError && (
                <div className="form-banner form-banner--error" role="alert">
                  <AlertTriangle aria-hidden="true" size={18} />
                  <span>{editForm.formState.errors.root.serverError.message}</span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="edit-name">Nome</label>
                  <input
                    id="edit-name"
                    type="text"
                    className="form-input"
                    aria-invalid={!!editForm.formState.errors.name}
                    {...editForm.register("name")}
                  />
                  {editForm.formState.errors.name && (
                    <span className="field-error">{editForm.formState.errors.name.message}</span>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="edit-email">Email</label>
                  <input
                    id="edit-email"
                    type="email"
                    className="form-input"
                    aria-invalid={!!editForm.formState.errors.email}
                    {...editForm.register("email")}
                  />
                  {editForm.formState.errors.email && (
                    <span className="field-error">{editForm.formState.errors.email.message}</span>
                  )}
                </div>
                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="edit-password">Nova senha (opcional)</label>
                  <input
                    id="edit-password"
                    type="password"
                    className="form-input"
                    autoComplete="new-password"
                    placeholder="Deixe em branco para manter"
                    aria-invalid={!!editForm.formState.errors.password}
                    {...editForm.register("password")}
                  />
                  {editForm.formState.errors.password && (
                    <span className="field-error">{editForm.formState.errors.password.message}</span>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeFormModal}
                  disabled={editForm.formState.isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={editForm.formState.isSubmitting}
                >
                  {editForm.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleTarget && (
        <div className="modal-overlay" onClick={() => !savingRole && setRoleTarget(null)}>
          <div
            className="modal-card modal-card--confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-role-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="confirm-role-title">
                <span className="confirm-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary-700)" }}>
                  <Shield />
                </span>
                Mudar permissão
              </h3>
              <button
                className="btn btn--icon modal-close"
                onClick={() => setRoleTarget(null)}
                aria-label="Fechar"
                disabled={savingRole}
              >
                <X />
              </button>
            </div>
            <div className="modal-form">
              <p className="confirm-body">
                Defina a nova permissão para <strong>{roleTarget.name}</strong>.
              </p>
              <div className="form-field" style={{ marginBottom: "var(--space-5)" }}>
                <label htmlFor="role-select">Permissão</label>
                <select
                  id="role-select"
                  className="form-input"
                  value={pendingRole}
                  onChange={(e) => setPendingRole(e.target.value as UserRole)}
                  disabled={savingRole}
                >
                  <option value="user">{ROLE_LABEL.user}</option>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setRoleTarget(null)}
                  disabled={savingRole}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void confirmChangeRole()}
                  disabled={savingRole || pendingRole === roleTarget.role}
                >
                  {savingRole ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal-card modal-card--confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-user-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="confirm-user-delete-title">
                <span className="confirm-icon"><AlertTriangle /></span>
                Excluir usuário?
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
                Você vai excluir <strong>{deleteTarget.name}</strong> ({deleteTarget.email}).
                Essa ação é permanente e não pode ser desfeita. Deseja continuar?
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

export default Users;
