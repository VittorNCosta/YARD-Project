import crypto from "node:crypto";

/**
 * Helpers para os specs E2E que precisam parsear cookies retornados pelo
 * Fastify e/ou forjar cookies válidos para testes de tampering.
 *
 * `signCookie` replica EXATAMENTE o algoritmo de `@fastify/cookie` (HMAC
 * SHA-256, base64 sem padding `=`). Confirmado lendo o source do plugin —
 * `node_modules/@fastify/cookie/signer.js` — usa `crypto.createHmac('sha256',
 * secret).update(value).digest('base64').replace(/=/g, '')`.
 *
 * Usado para:
 * 1. Recriar a versão "signed" do cookie quando precisamos enviar ele com
 *    `Cookie:` header em outra request (`app.inject` aceita string crua,
 *    não auto-assina).
 * 2. Forjar cookies em testes de tampering — assinatura válida, payload
 *    interno corrompido — para verificar que `unsignCookie` aceita mas
 *    a verificação subsequente (JWT) rejeita.
 */
export interface ParsedCookie {
    value: string;
    attrs: Record<string, string | true>;
}

export function parseSetCookie(
    headers: string | string[] | undefined
): Record<string, ParsedCookie> {
    if (!headers) return {};
    const arr = Array.isArray(headers) ? headers : [headers];
    const out: Record<string, ParsedCookie> = {};

    for (const raw of arr) {
        const parts = raw.split(";").map((p) => p.trim());
        if (parts.length === 0 || !parts[0]) continue;

        const eq = parts[0].indexOf("=");
        if (eq < 0) continue;
        const name = parts[0].slice(0, eq);
        // Decodifica o valor: a serializaçao do `cookie` aplica
        // `encodeURIComponent`. Devolvemos o valor *cru* (decodado) para
        // que o caller possa repassar via `inject({ cookies })` sem
        // dupla-codificação.
        const rawValue = parts[0].slice(eq + 1);
        let value = rawValue;
        try {
            value = decodeURIComponent(rawValue);
        } catch {
            // pass — mantém raw em caso de % inválido.
        }

        const attrs: Record<string, string | true> = {};
        for (let i = 1; i < parts.length; i++) {
            const seg = parts[i];
            if (!seg) continue;
            const idx = seg.indexOf("=");
            if (idx < 0) {
                attrs[seg.toLowerCase()] = true;
            } else {
                attrs[seg.slice(0, idx).toLowerCase()] = seg.slice(idx + 1);
            }
        }
        out[name] = { value, attrs };
    }
    return out;
}

/**
 * Replica o `Signer` de `@fastify/cookie`: HMAC-SHA256, base64 sem padding.
 */
export function signCookie(value: string, secret: string): string {
    const sig = crypto
        .createHmac("sha256", secret)
        .update(value)
        .digest("base64")
        .replace(/=/g, "");
    return `${value}.${sig}`;
}

/**
 * Decompõe um cookie assinado em `{ value, signature }`. Reflete o split
 * que `@fastify/cookie` faz em `_unsign` (último ponto separa).
 */
export function splitSignedCookie(signed: string): {
    value: string;
    signature: string;
} {
    const idx = signed.lastIndexOf(".");
    if (idx < 0) return { value: signed, signature: "" };
    return {
        value: signed.slice(0, idx),
        signature: signed.slice(idx + 1),
    };
}

/**
 * Constrói o header `Cookie: name=signed; name2=signed` para `app.inject()`.
 * Note que `app.inject()` exige percent-encoding dos valores que possam
 * conter `;`, `,` etc. — para JWTs e signatures isso não é um problema.
 */
export function buildCookieHeader(
    cookies: Record<string, string>
): string {
    return Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
}

/**
 * Decodifica o payload de um JWT base64url. Não valida assinatura.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(
    token: string
): T {
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("invalid jwt");
    const p = parts[1];
    if (!p) throw new Error("invalid jwt payload");
    const json = Buffer.from(p, "base64url").toString("utf8");
    return JSON.parse(json) as T;
}

/**
 * Constrói um JWT alg=none manualmente (header.payload.signature_vazia).
 */
export function buildAlgNoneJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(
        JSON.stringify({ alg: "none", typ: "JWT" })
    ).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.`;
}
