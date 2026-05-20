import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  login as authLogin,
  logout as authLogout,
  me as authMe,
  refresh as authRefresh,
  register as authRegister,
  type LoginInput,
  type RegisterInput,
  type User,
} from "../services/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Bootstrap: tenta recuperar a sessão pela cookie atual.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await authMe();
        if (!cancelled) setUser(current);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Logout forçado (refresh falhou em algum request encadeado).
  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener("auth:logout", onForcedLogout);
    return () => window.removeEventListener("auth:logout", onForcedLogout);
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<User> => {
    setError(null);
    try {
      const next = await authLogin(input);
      setUser(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao entrar.";
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<User> => {
    setError(null);
    try {
      const next = await authRegister(input);
      setUser(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao criar conta.";
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authLogout();
    } catch {
      // mesmo que o backend falhe, derrubamos a sessão localmente.
    } finally {
      setUser(null);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const next = await authRefresh();
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, error, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}
