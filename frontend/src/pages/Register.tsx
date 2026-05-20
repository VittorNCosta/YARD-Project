import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Lock, Mail, User as UserIcon, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../services/api";
import "./Login.css";

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Informe seu nome.")
      .min(2, "Nome muito curto.")
      .max(120, "Nome muito longo."),
    email: z
      .string()
      .min(1, "Informe seu email.")
      .email("Email inválido."),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendMessage(err)
          : "Não foi possível criar a conta.";
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { message: "Este email já está em uso." });
      } else {
        setError("root.serverError", { message });
      }
    }
  };

  const serverError = errors.root?.serverError?.message;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">
            <UserPlus aria-hidden="true" />
          </div>
          <h1>Criar conta</h1>
          <p>Junte-se ao painel YARD Logística</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && (
            <div className="form-banner form-banner--error" role="alert">
              <AlertTriangle aria-hidden="true" size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="name">Nome</label>
            <div className="auth-input-wrap">
              <UserIcon aria-hidden="true" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="form-input"
                placeholder="Seu nome completo"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
            </div>
            {errors.name && (
              <span id="name-error" className="field-error">
                {errors.name.message}
              </span>
            )}
          </div>

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
                autoComplete="new-password"
                className="form-input"
                placeholder="Mínimo 8 caracteres"
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
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirmar senha</label>
            <div className="auth-input-wrap">
              <Lock aria-hidden="true" />
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="form-input"
                placeholder="Repita sua senha"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <span id="confirm-error" className="field-error">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn--primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="btn-spinner" aria-hidden="true" /> : <UserPlus size={16} />}
            <span>{isSubmitting ? "Criando..." : "Criar conta"}</span>
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Já tem uma conta?</span>
          <Link to="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
};

function mapBackendMessage(err: ApiError): string {
  if (err.status === 0) return "Não foi possível contatar o servidor.";
  if (err.status === 409) return "Este email já está em uso.";
  if (err.status === 400) return err.message || "Dados inválidos.";
  return err.message || "Falha ao criar a conta.";
}

export default Register;
