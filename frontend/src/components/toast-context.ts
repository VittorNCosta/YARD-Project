import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
}

export type ToastInputArg = string | ToastInput;

export interface ToastApi {
  success: (input: ToastInputArg) => void;
  error: (input: ToastInputArg) => void;
  info: (input: ToastInputArg) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>.");
  }
  return ctx;
}
