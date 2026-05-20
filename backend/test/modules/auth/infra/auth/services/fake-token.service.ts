import {
    type AccessTokenPayload,
    type RefreshTokenPayload,
    TokenService,
} from "@/modules/auth/domain/auth/services/token-service";

/**
 * Fake determinístico para testes. `sign*` codifica o payload em base64 e
 * prefixa com o tipo do token. `verify*` decodifica e valida o tipo.
 *
 * Não tem expiração — testes que precisam simular expiração devem usar
 * outro mecanismo (ex.: passar a session já expirada para o repositório).
 */
export class FakeTokenService extends TokenService {
    async signAccess(payload: AccessTokenPayload): Promise<string> {
        return `access.${this.encode(payload)}`;
    }

    async signRefresh(payload: RefreshTokenPayload): Promise<string> {
        return `refresh.${this.encode(payload)}`;
    }

    async verifyAccess(token: string): Promise<AccessTokenPayload> {
        if (!token.startsWith("access.")) {
            throw new Error("invalid access token");
        }
        return this.decode<AccessTokenPayload>(token.slice("access.".length));
    }

    async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
        if (!token.startsWith("refresh.")) {
            throw new Error("invalid refresh token");
        }
        return this.decode<RefreshTokenPayload>(token.slice("refresh.".length));
    }

    private encode(payload: unknown): string {
        return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    }

    private decode<T>(encoded: string): T {
        const json = Buffer.from(encoded, "base64").toString("utf8");
        return JSON.parse(json) as T;
    }
}
