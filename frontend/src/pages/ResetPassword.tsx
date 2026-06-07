import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, AlertTriangle, KeyRound } from "lucide-react";
import { resetPassword } from "../services/auth";
import { ApiError } from "../services/api";
import "./Login.css";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(128, "Senha muito longa.")
      .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número."),
    confirmPassword: z.string().min(1, "Confirme sua nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues): Promise<void> => {
    try {
      await resetPassword({ token, password: values.password });
      // Pequeno delay para o usuário ler o feedback antes de redirecionar.
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendMessage(err)
          : "Não foi possível redefinir a senha. Tente novamente.";
      setError("root.serverError", { message });
    }
  };

  const serverError = errors.root?.serverError?.message;

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__brand">
              <AlertTriangle aria-hidden="true" />
            </div>
            <h1>Link inválido</h1>
            <p>O link de redefinição está incompleto ou foi alterado.</p>
          </div>

          <div className="form-banner form-banner--error" role="alert">
            <AlertTriangle aria-hidden="true" size={18} />
            <span>
              Solicite um novo link de recuperação para continuar.
            </span>
          </div>

          <div className="auth-card__footer">
            <span>Precisa de um novo link?</span>
            <Link to="/forgot-password">Solicitar novo</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">
            <KeyRound aria-hidden="true" />
          </div>
          <h1>Redefinir senha</h1>
          <p>Escolha uma nova senha para sua conta</p>
        </div>

        {isSubmitSuccessful && !serverError ? (
          <div className="form-banner form-banner--info" role="status">
            <KeyRound aria-hidden="true" size={18} />
            <span>
              Senha redefinida com sucesso! Redirecionando para o login...
            </span>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <div className="form-banner form-banner--error" role="alert">
                <AlertTriangle aria-hidden="true" size={18} />
                <span>{serverError}</span>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="password">Nova senha</label>
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
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <div className="auth-input-wrap">
                <Lock aria-hidden="true" />
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="form-input"
                  placeholder="Repita a nova senha"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                    errors.confirmPassword ? "confirm-error" : undefined
                  }
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <span id="confirm-error" className="field-error">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-spinner" aria-hidden="true" />
              ) : (
                <KeyRound size={16} />
              )}
              <span>{isSubmitting ? "Redefinindo..." : "Redefinir senha"}</span>
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <span>Lembrou a senha?</span>
          <Link to="/login">Voltar para o login</Link>
        </div>
      </div>
    </div>
  );
};

function mapBackendMessage(err: ApiError): string {
  if (err.status === 0) return "Não foi possível contatar o servidor.";
  if (err.status === 410)
    return "Este link expirou ou já foi usado. Solicite um novo.";
  if (err.status === 400) return err.message || "Token inválido ou senha fraca.";
  if (err.status === 429)
    return "Muitas tentativas. Aguarde um minuto e tente novamente.";
  return err.message || "Falha ao redefinir a senha.";
}

export default ResetPassword;
