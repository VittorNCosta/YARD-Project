import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import Veiculos from '../pages/vehicles';
import Authorizations from '../pages/Authorizations';
import AuthorizationDetail from '../pages/AuthorizationDetail';
import Docks from '../pages/Docks';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Users from '../pages/Users';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleGuard from '../components/RoleGuard';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../components/Toast';

import './App.css';

const AUTH_ROUTES = new Set<string>([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

function AppShell() {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.has(location.pathname);

  return (
    <div className="App">
      <Header />

      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/autorizacoes" element={<Authorizations />} />
            <Route path="/autorizacoes/:id" element={<AuthorizationDetail />} />
            <Route path="/docas" element={<Docks />} />
            <Route path="/veiculos" element={<Veiculos />} />

            <Route element={<RoleGuard role="admin" />}>
              <Route path="/usuarios" element={<Users />} />
            </Route>
          </Route>
        </Routes>
      </main>

      {!isAuthRoute && (
        <footer className="footer">
          <p>© 2026 YARD Logística - Sistema de Gerenciamento de Pátio</p>
          <p>Versão 0.0.1 - Desenvolvimento</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
