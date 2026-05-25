import React, { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const AUTH_ROUTES = new Set<string>(['/login', '/register']);

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  // Em rotas de autenticação, o layout das páginas já cobre 100vh — não exibimos o Header.
  if (AUTH_ROUTES.has(location.pathname)) {
    return null;
  }

  const handleLogout = useCallback((): void => {
    void logout();
  }, [logout]);

  return (
    <header className="header">
      <div className="logo-container">
        <div className="logo-placeholder">
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="50" height="50" rx="10" fill="#2c3e50" />
            <path d="M15 25L25 15L35 25L25 35L15 25Z" fill="#ecf0f1" />
            <circle cx="25" cy="25" r="5" fill="#3498db" />
          </svg>
        </div>
        <h1 className="company-name">YARD LOGÍSTICA</h1>
      </div>

      <nav className="nav-menu" aria-label="Navegação principal">
        <ul>
          <li><NavLink to="/" end>Dashboard</NavLink></li>
          <li><a href="#estoque">Estoque</a></li>
          <li><NavLink to="/autorizacoes">Autorizacoes</NavLink></li>
          <li><NavLink to="/docas">Docas</NavLink></li>
          <li><a href="#relatorios">Relatórios</a></li>
          <li><NavLink to="/veiculos">Veículos</NavLink></li>
          {isAdmin && (
            <li><NavLink to="/usuarios">Usuários</NavLink></li>
          )}
        </ul>
      </nav>

      {user && (
        <div className="header-user">
          <div className="header-user__info">
            <span className="header-user__name">{user.name}</span>
            <span className="header-user__role">
              {user.role === 'admin' ? 'Administrador' : 'Usuário'}
            </span>
          </div>
          <div className="header-user__avatar" aria-hidden="true">
            {getInitials(user.name)}
          </div>
          <button
            type="button"
            className="header-user__logout"
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
