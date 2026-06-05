import { env } from "@/config/env";
import {
    EmailService,
    type SendPasswordResetEmailInput,
} from "@/modules/auth/domain/auth/services/email-service";
import nodemailer, { type Transporter } from "nodemailer";
import { injectable } from "tsyringe";

import { escapeHtml } from "@/modules/auth/infra/auth/utils/escape-html";

/**
 * Implementação concreta de `EmailService` via Nodemailer + SMTP.
 *
 * - Lazy `getTransporter()`: cria a conexão sob demanda (e a reutiliza
 *   no pool interno do Nodemailer entre requests).
 * - `subject` estático — sem interpolação de input do usuário (F-01).
 * - `escapeHtml(name)` no template HTML (F-01).
 * - Bloco `text` plain-text fallback — sem escape mas sem renderização HTML.
 * - Erros: o caller do use-case trata `try/catch` e loga apenas
 *   `err.message` + `err.code` (F-09). Aqui apenas relançamos.
 */
@injectable()
export class NodemailerEmailService extends EmailService {
    private transporter: Transporter | null = null;

    private getTransporter(): Transporter {
        if (this.transporter) return this.transporter;
        if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
            throw new Error(
                "smtp.not-configured: SMTP_HOST/SMTP_USER/SMTP_PASS são obrigatórios fora de testes."
            );
        }
        this.transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
        });
        return this.transporter;
    }

    async sendPasswordResetEmail(
        input: SendPasswordResetEmailInput
    ): Promise<void> {
        const safeName = escapeHtml(input.name);
        // resetUrl é construído pelo backend (FRONTEND_URL validado + token
        // opaco gerado por crypto.randomBytes) — seguro como href, mas ainda
        // assim escapamos para não permitir injection via FRONTEND_URL malicioso.
        const safeUrl = escapeHtml(input.resetUrl);
        const ttlMinutes = env.PASSWORD_RESET_TTL_MINUTES;

        const subject = "Redefinição de senha — YARD Logística";

        const text = [
            `Olá ${input.name},`,
            "",
            "Recebemos uma solicitação para redefinir sua senha.",
            "Acesse o link abaixo para criar uma nova senha:",
            "",
            input.resetUrl,
            "",
            `Este link expira em ${ttlMinutes} minutos e só pode ser usado uma vez.`,
            "Se você não solicitou, ignore este e-mail — sua senha permanece a mesma.",
            "",
            "— Equipe YARD Logística",
        ].join("\n");

        const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="referrer" content="no-referrer" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; color:#1f2937; line-height:1.5;">
    <p>Olá ${safeName},</p>
    <p>Recebemos uma solicitação para redefinir sua senha.</p>
    <p>Para criar uma nova senha, clique no botão abaixo:</p>
    <p style="margin: 24px 0;">
      <a href="${safeUrl}" style="background:#0f766e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">
        Redefinir senha
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">
      Ou copie e cole esta URL no seu navegador:<br/>
      <span style="word-break:break-all;">${safeUrl}</span>
    </p>
    <p>Este link expira em <strong>${ttlMinutes} minutos</strong> e só pode ser usado uma vez.</p>
    <p>Se você não solicitou esta redefinição, ignore este e-mail — sua senha permanece a mesma.</p>
    <p style="margin-top:32px;color:#6b7280;font-size:12px;">— Equipe YARD Logística</p>
  </body>
</html>`;

        await this.getTransporter().sendMail({
            from: env.SMTP_FROM,
            to: input.to,
            subject,
            text,
            html,
        });
    }
}
