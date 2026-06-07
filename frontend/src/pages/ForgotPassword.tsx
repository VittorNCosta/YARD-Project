import React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, AlertTriangle } from "lucide-react";
import { forgotPassword } from "../services/auth";
import { ApiError } from "../services/api";
import "./Login.css";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Informe seu email.")
    .email("Email inválido."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues): Promise<void> => {
    try {
      await forgotPassword({ email: values.email });
      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendMessage(err)
          : "Não foi possível enviar o link. Tente novamente.";
      setError("root.serverError", { message });
    }
  };

  const serverError = errors.root?.serverError?.message;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">
            <Mail aria-hidden="true" />
          </div>
          <h1>Recuperar senha</h1>
          <p>Informe seu email para receber o link de redefinição</p>
        </div>

        {submitted ? (
          <div className="form-banner form-banner--info" role="status">
            <Mail aria-hidden="true" size={18} />
            <span>
              Se este email estiver cadastrado, você receberá um link para
              redefinir sua senha em instantes. Verifique sua caixa de entrada
              e a pasta de spam.
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

            <button
              type="submit"
              className="btn btn--primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-spinner" aria-hidden="true" />
              ) : (
                <Mail size={16} />
              )}
              <span>{isSubmitting ? "Enviando..." : "Enviar link"}</span>
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
  if (err.status === 429)
    return "Muitas tentativas. Aguarde um minuto e tente novamente.";
  if (err.status === 400) return "Email inválido.";
  return err.message || "Falha ao enviar o link.";
}

export default ForgotPassword;
