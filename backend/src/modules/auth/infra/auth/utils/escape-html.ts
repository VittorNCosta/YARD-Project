/**
 * Escapa caracteres HTML-significativos em uma string para uso seguro em
 * templates de e-mail (F-01 — Email injection via `user.name`).
 *
 * Cobre os 5 caracteres do OWASP XSS Prevention Cheat Sheet:
 *   & < > " '
 *
 * Não-objetivo: este helper NÃO é alternativa a serialização adequada em
 * outros contextos (atributos, URLs, JSON). É puramente para o corpo de
 * template HTML transacional.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
