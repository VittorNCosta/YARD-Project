/**
 * Contrato de envio de e-mail transacional.
 *
 * Por design o método é específico (não genérico `send()`) para não vazar
 * detalhes de template no use-case — toda a renderização HTML/texto fica
 * na implementação concreta.
 *
 * IMPORTANTE: implementações DEVEM escapar HTML em todos os campos dinâmicos
 * antes da interpolação no template HTML (F-01: register Zod aceita
 * `<script>` e CRLF no `name`, então `name` não é seguro por construção).
 */
export interface SendPasswordResetEmailInput {
    to: string;
    name: string;
    resetUrl: string;
}

export abstract class EmailService {
    abstract sendPasswordResetEmail(
        input: SendPasswordResetEmailInput
    ): Promise<void>;
}
