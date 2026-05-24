import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw, Truck } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import MovementDetailPanel from "../components/MovementDetailPanel";
import { getYardMovementById, type YardMovement } from "../services/yardMovements";
import "./Authorizations.css";

const AuthorizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [movement, setMovement] = useState<YardMovement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const listSearch =
    typeof location.state === "object" &&
    location.state !== null &&
    "listSearch" in location.state &&
    typeof location.state.listSearch === "string"
      ? location.state.listSearch
      : "";

  const listHref = `/autorizacoes${listSearch}`;

  const fetchMovement = useCallback(async (): Promise<void> => {
    if (!id) {
      setError("Movimentacao nao informada.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getYardMovementById(id);
      setMovement(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nao foi possivel carregar a movimentacao."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchMovement();
  }, [fetchMovement]);

  return (
    <div className="authorizations-page authorization-detail-page">
      <div className="authorizations-page-header">
        <div className="page-title-wrap">
          <h2>Detalhe da Movimentacao</h2>
          <div className="page-subtitle">
            Historico operacional e auditoria da autorizacao.
          </div>
        </div>
        <div className="authorizations-page-actions">
          <button
            className="btn btn--secondary"
            type="button"
            onClick={() => navigate(listHref)}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <button
            className="btn btn--secondary"
            type="button"
            onClick={() => void fetchMovement()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="status-badge status-badge--danger authorizations-alert" role="alert">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="authorizations-section authorization-detail-section">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-illus"><Truck /></div>
            <h4>Carregando movimentacao...</h4>
            <p>Buscando dados de auditoria e linha do tempo.</p>
          </div>
        ) : movement ? (
          <div className="movement-detail-page-content">
            <MovementDetailPanel movement={movement} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-illus"><AlertTriangle /></div>
            <h4>Movimentacao nao encontrada</h4>
            <p>Volte para a lista e selecione outra autorizacao.</p>
            <Link className="btn btn--primary" to={listHref}>
              <ArrowLeft size={16} /> Voltar para autorizacoes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorizationDetail;

