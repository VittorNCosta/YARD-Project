/**
 * Converte uma string de duração no formato aceito pelo `jsonwebtoken`
 * (`"15m"`, `"7d"`, `"1h"`, `"30s"`, ou apenas número em segundos) para
 * segundos como inteiro.
 *
 * Usado para alinhar o `maxAge` dos cookies com o TTL do JWT.
 *
 * Lança se o formato for desconhecido — fail-fast no boot evita
 * incoerência silenciosa entre TTL do token e do cookie.
 */
export function parseDurationSeconds(input: string): number {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    const match = trimmed.match(/^(\d+)\s*([smhd])$/i);
    if (!match) {
        throw new Error(
            `Duração inválida: "${input}". Use formato como "15m", "1h", "7d".`
        );
    }
    const valueStr = match[1];
    const unit = match[2];
    if (!valueStr || !unit) {
        throw new Error(
            `Duração inválida: "${input}". Use formato como "15m", "1h", "7d".`
        );
    }
    const value = parseInt(valueStr, 10);
    switch (unit.toLowerCase()) {
        case "s":
            return value;
        case "m":
            return value * 60;
        case "h":
            return value * 60 * 60;
        case "d":
            return value * 60 * 60 * 24;
        default:
            throw new Error(`Unidade desconhecida em duração: "${input}".`);
    }
}
