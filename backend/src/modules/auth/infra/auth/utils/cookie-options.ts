import { env } from "@/config/env";
import type { CookieSerializeOptions } from "@fastify/cookie";

/**
 * Configurações padrão dos cookies de auth.
 *
 * - `httpOnly`: token nunca acessível via JS — mitiga XSS.
 * - `secure`: só em produção (em dev rodamos http://localhost).
 * - `sameSite: "lax"`: protege contra CSRF cross-site simples mantendo
 *   navegação top-level com cookie (necessário para fluxo OAuth/SSO futuro).
 * - `signed: true`: cookie é assinado via COOKIE_SECRET (@fastify/cookie).
 */
function baseCookieOptions(maxAgeSeconds: number): CookieSerializeOptions {
    return {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        signed: true,
        maxAge: maxAgeSeconds,
    };
}

/** Access token: visível em qualquer rota (path: "/"). */
export function accessCookieOptions(
    maxAgeSeconds: number
): CookieSerializeOptions {
    return {
        ...baseCookieOptions(maxAgeSeconds),
        path: "/",
    };
}

/** Refresh token: restrito ao prefixo `/api/auth` para reduzir exposição. */
export function refreshCookieOptions(
    maxAgeSeconds: number
): CookieSerializeOptions {
    return {
        ...baseCookieOptions(maxAgeSeconds),
        path: "/api/auth",
    };
}

/**
 * Mesmas opções, sem `maxAge`, usadas para `clearCookie` — o `path` precisa
 * bater para o navegador identificar o cookie a apagar.
 */
export function accessClearCookieOptions(): CookieSerializeOptions {
    return {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        signed: true,
    };
}

export function refreshClearCookieOptions(): CookieSerializeOptions {
    return {
        path: "/api/auth",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        signed: true,
    };
}
