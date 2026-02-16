import React from 'react';
import './Header.css';

const Header: React.FC = () => {
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
      <nav className="nav-menu">
        <ul>
          <li><a href="#dashboard">Dashboard</a></li>
          <li><a href="#estoque">Estoque</a></li>
          <li><a href="#movimentacoes">Movimentações</a></li>
          <li><a href="#relatorios">Relatórios</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;