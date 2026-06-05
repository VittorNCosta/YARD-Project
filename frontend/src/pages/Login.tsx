import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, Lock, Mail, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../services/api";
import "./Login.css";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Informe seu email.")
    .email("Email inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra.")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: string;
}

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendMessage(err)
          : "Não foi possível entrar. Tente novamente.";
      setError("root.serverError", { message });
    }
  };

  const serverError = errors.root?.serverError?.message;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">
            <LogIn aria-hidden="true" />
          </div>
          <h1>Entrar</h1>
          <p>Acesse o painel YARD Logística</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && (
            <div className="form-banner form-banner--error" role="alert">
              <AlertTriangle aria-hidden="true" size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <Mail aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="form-input"
                placeholder="voce@empresa.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <span id="email-error" className="field-error">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <div className="auth-input-wrap">
              <Lock aria-hidden="true" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="form-input"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <span id="password-error" className="field-error">
                {errors.password.message}
              </span>
            )}
            <Link to="/forgot-password" className="auth-form__forgot-link">
              Esqueci minha senha
            </Link>
          </div>

          <button type="submit" className="btn btn--primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="btn-spinner" aria-hidden="true" /> : <LogIn size={16} />}
            <span>{isSubmitting ? "Entrando..." : "Entrar"}</span>
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Ainda não tem conta?</span>
          <Link to="/register">Criar conta</Link>
        </div>
      </div>
    </div>
  );
};

function mapBackendMessage(err: ApiError): string {
  if (err.status === 0) return "Não foi possível contatar o servidor.";
  if (err.status === 401) return "Email ou senha incorretos.";
  if (err.status === 429) return "Muitas tentativas. Aguarde um momento.";
  return err.message || "Falha ao entrar.";
}

export default Login;
