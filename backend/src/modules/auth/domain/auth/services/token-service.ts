import type { UserRole } from "@/modules/user/domain/user/enums/user-role";

export interface AccessTokenPayload {
    sub: string;
    role: UserRole;
}

export interface RefreshTokenPayload {
    sub: string;
    sid: string;
}

/**
 * Abstração para emissão e verificação dos tokens JWT.
 *
 * - `signAccess`: token curto (ex.: 15min), payload `{sub, role}`.
 * - `signRefresh`: token longo (ex.: 7d), payload `{sub, sid}` onde
 *   `sid` é o id da Session persistida (permite revogação no DB).
 *
 * Em produção usamos `JwtTokenService` (HS256). Em testes,
 * `FakeTokenService` retorna o payload codificado em base64.
 */
export abstract class TokenService {
    abstract signAccess(payload: AccessTokenPayload): Promise<string>;
    abstract signRefresh(payload: RefreshTokenPayload): Promise<string>;
    abstract verifyAccess(token: string): Promise<AccessTokenPayload>;
    abstract verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}
