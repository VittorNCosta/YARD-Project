import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import {
  ToastContext,
  type ToastApi,
  type ToastInput,
  type ToastInputArg,
  type ToastVariant,
} from "./toast-context";
import "./Toast.css";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

const AUTO_DISMISS_MS = 4000;

function normalize(input: ToastInputArg): ToastInput {
  return typeof input === "string" ? { title: input } : input;
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 aria-hidden="true" />,
  error: <AlertTriangle aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef<number>(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, input: ToastInputArg) => {
      const id = ++idRef.current;
      const { title, description } = normalize(input);
      setToasts((prev) => [...prev, { id, variant, title, description }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (input) => push("success", input),
      error: (input) => push("error", input),
      info: (input) => push("info", input),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant}`}
            role={t.variant === "error" ? "alert" : "status"}
          >
            <div className="toast__icon">{ICONS[t.variant]}</div>
            <div className="toast__body">
              <div className="toast__title">{t.title}</div>
              {t.description && <div className="toast__desc">{t.description}</div>}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Fechar notificação"
              onClick={() => dismiss(t.id)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

