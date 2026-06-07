import {
    EmailService,
    type SendPasswordResetEmailInput,
} from "@/modules/auth/domain/auth/services/email-service";

import { escapeHtml } from "@/modules/auth/infra/auth/utils/escape-html";

/**
 * Fake do `EmailService` para testes.
 *
 * - Acumula chamadas em `calls` para asserts (URL, name, to).
 * - `shouldFail = true` simula erro do transporter (use-case deve engolir).
 * - Renderiza um HTML/text mínimo (espelha o Nodemailer real) para que specs
 *   de F-01 possam asseverar `<script>` escapado.
 */
export interface CapturedEmail extends SendPasswordResetEmailInput {
    html: string;
    text: string;
}

export class FakeEmailService extends EmailService {
    public calls: CapturedEmail[] = [];
    public shouldFail = false;

    async sendPasswordResetEmail(
        input: SendPasswordResetEmailInput
    ): Promise<void> {
        if (this.shouldFail) {
            const err = new Error("smtp connection refused") as Error & {
                code?: string;
            };
            err.code = "ECONNREFUSED";
            throw err;
        }
        const safeName = escapeHtml(input.name);
        const safeUrl = escapeHtml(input.resetUrl);
        const html = `<p>Olá ${safeName},</p><p><a href="${safeUrl}">Redefinir senha</a></p><p>${safeUrl}</p>`;
        const text = `Olá ${input.name},\n\n${input.resetUrl}`;
        this.calls.push({ ...input, html, text });
    }

    reset(): void {
        this.calls = [];
        this.shouldFail = false;
    }
}
