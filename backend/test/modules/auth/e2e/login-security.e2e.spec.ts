import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import { buildTestApp } from "@test/helpers/build-test-app";
import {
    buildAlgNoneJwt,
    parseSetCookie,
    signCookie,
    splitSignedCookie,
} from "@test/helpers/http-cookies";
import {
    cleanMongo,
    startMongo,
    stopMongo,
} from "@test/helpers/mongo-memory";

let app: FastifyInstance;

const COOKIE_SECRET = "z".repeat(32);
const ACCESS_SECRET = "x".repeat(32);
const REFRESH_SECRET = "y".repeat(32);
const FRONTEND_URL = "http://localhost:5173";

const REGISTER_BODY = {
    name: "Sec User",
    email: "sec.user@example.com",
    password: "Password1",
} as const;

let ipCounter = 0;
function uniqueIp(): string {
    ipCounter += 1;
    const a = (ipCounter >> 8) & 0xff;
    const b = ipCounter & 0xff;
    return `10.55.${a}.${b}`;
}

async function registerUser(
    body: { name: string; email: string; password: string } = REGISTER_BODY
): Promise<{ accessSigned: string; refreshSigned: string }> {
    const reg = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: body,
        remoteAddress: uniqueIp(),
    });
    if (reg.statusCode !== 201) {
        throw new Error(`register failed: ${reg.statusCode} ${reg.body}`);
    }
    const cookies = parseSetCookie(
        reg.headers["set-cookie"] as string | string[] | undefined
    );
    const accessSigned = cookies.access_token?.value ?? "";
    const refreshSigned = cookies.refresh_token?.value ?? "";
    return { accessSigned, refreshSigned };
}

describe("Login security (E2E - OWASP coverage)", () => {
    beforeAll(async () => {
        await startMongo();
        app = await buildTestApp();
    });

    afterAll(async () => {
        await app.close();
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    // 1
    it("same generic 401 message for wrong password and unknown email", async () => {
        await registerUser();

        const wrongPass = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: REGISTER_BODY.email, password: "WrongPass1" },
            remoteAddress: uniqueIp(),
        });
        const unknownEmail = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "ghost@example.com", password: "Password1" },
            remoteAddress: uniqueIp(),
        });

        expect(wrongPass.statusCode).toBe(401);
        expect(unknownEmail.statusCode).toBe(401);

        const wpJson = wrongPass.json() as {
            success: boolean;
            message: string;
        };
        const ueJson = unknownEmail.json() as {
            success: boolean;
            message: string;
        };

        // EXATA igualdade de strings (não regex).
        expect(wpJson.message).toBe(ueJson.message);
        expect(wpJson.success).toBe(false);
        expect(ueJson.success).toBe(false);
        // Sanity: a mensagem é a chave i18n genérica esperada.
        expect(wpJson.message).toBe("auth.invalid-credentials");
    });

    // 2
    it("helmet sets HSTS, CSP, X-Content-Type-Options, X-Frame-Options", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            remoteAddress: uniqueIp(),
        });
        // 401 OK — só queremos os headers de segurança.
        expect(res.headers["strict-transport-security"]).toBeDefined();
        expect(String(res.headers["strict-transport-security"])).toMatch(
            /max-age=\d+/
        );

        expect(res.headers["content-security-policy"]).toBeDefined();
        expect(String(res.headers["content-security-policy"])).toMatch(
            /default-src\s+'self'/
        );

        expect(res.headers["x-content-type-options"]).toBe("nosniff");

        // Helmet's frameguard sends X-Frame-Options: DENY
        expect(String(res.headers["x-frame-options"]).toUpperCase()).toBe(
            "DENY"
        );
    });

    // 3
    it("CORS rejects unauthorized origin (ACAO is locked to configured origin, not evil one)", async () => {
        const evil = "http://evil.example.com";
        const res = await app.inject({
            method: "OPTIONS",
            url: "/api/auth/login",
            headers: {
                origin: evil,
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type",
            },
            remoteAddress: uniqueIp(),
        });

        // @fastify/cors v11 com `origin: "<string>"` retorna SEMPRE o
        // origin configurado — nunca espelha o origin da request. Logo,
        // o browser do atacante recebe ACAO com FRONTEND_URL, que não
        // bate com o seu próprio origin → bloqueia a request no client.
        // Garantimos aqui que o servidor NÃO está espelhando o origin
        // malicioso, que seria a vulnerabilidade real.
        const acao = res.headers["access-control-allow-origin"];
        expect(acao).not.toBe(evil);
        expect(acao).toBe(FRONTEND_URL);
    });

    // 4
    it("CORS allows configured origin with credentials", async () => {
        const res = await app.inject({
            method: "OPTIONS",
            url: "/api/auth/login",
            headers: {
                origin: FRONTEND_URL,
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type",
            },
            remoteAddress: uniqueIp(),
        });

        expect(res.headers["access-control-allow-origin"]).toBe(FRONTEND_URL);
        expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    // 5
    it("rate-limit 6th login in 1 min returns 429", async () => {
        await registerUser();
        const fixedIp = "203.0.113.55";

        const calls = [];
        for (let i = 0; i < 6; i++) {
            calls.push(
                app.inject({
                    method: "POST",
                    url: "/api/auth/login",
                    payload: {
                        email: REGISTER_BODY.email,
                        password: "WrongPass1", // sempre 401 ou 429
                    },
                    remoteAddress: fixedIp,
                })
            );
        }
        const results = await Promise.all(calls);
        // 6ª deve ser 429 (5 max no @fastify/rate-limit configurado).
        const last = results[results.length - 1];
        if (!last) throw new Error("no last result");
        expect(last.statusCode).toBe(429);
    });

    // 6
    it("body >100KB does not crash; returns 4xx", async () => {
        // Fastify default bodyLimit é 1MB. 100KB ainda passa, mas a Zod
        // schema rejeita password com >128 chars. Geramos um payload
        // intencionalmente gigante (200KB) que deve ser rejeitado.
        const huge = "p".repeat(200_000);
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: REGISTER_BODY.email, password: huge },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBeGreaterThanOrEqual(400);
        expect(res.statusCode).toBeLessThan(500);
    });

    // 7 — corrupted JWT inside a properly-re-signed cookie
    it("tampered access cookie value (re-signed but corrupted JWT) → /me 401", async () => {
        const { accessSigned } = await registerUser();
        const { value: rawJwt } = splitSignedCookie(accessSigned);

        // Corrompe o JWT (altera 1 char no payload), depois re-assina o
        // cookie com o segredo correto. unsignCookie passa, verifyAccess
        // falha.
        const parts = rawJwt.split(".");
        if (parts.length !== 3) throw new Error("bad jwt");
        const [h, p, s] = parts;
        // Flip um char no meio do payload base64
        if (!p) throw new Error("missing payload");
        const broken =
            p.slice(0, 5) + (p[5] === "A" ? "B" : "A") + p.slice(6);
        const corruptedJwt = `${h}.${broken}.${s}`;
        const reSigned = signCookie(corruptedJwt, COOKIE_SECRET);

        const res = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: reSigned },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(401);
    });

    // 8 — bad cookie signature (HMAC fails)
    it("tampered cookie signature → /me 401 (unsignCookie inválido)", async () => {
        const { accessSigned } = await registerUser();
        // Adiciona lixo no fim — quebra HMAC.
        const broken = `${accessSigned}deadbeef`;

        const res = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: broken },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(401);
    });

    // 9 — JWT alg=none
    it("JWT alg=none in access cookie → /me 401", async () => {
        const noneJwt = buildAlgNoneJwt({
            sub: "user-1",
            role: "ADMIN",
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const signedCookie = signCookie(noneJwt, COOKIE_SECRET);

        const res = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: signedCookie },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(401);
    });

    // 10 — JWT signed with refresh secret used as access
    it("JWT signed with refresh secret used as access → /me 401", async () => {
        // Forja um JWT com payload de access (sub+role) mas assinado com
        // o REFRESH_SECRET. O cookie em si é assinado com COOKIE_SECRET
        // corretamente.
        const malicious = jwt.sign(
            { sub: "user-1", role: "ADMIN" },
            REFRESH_SECRET,
            { algorithm: "HS256", expiresIn: "1h" }
        );
        const signedCookie = signCookie(malicious, COOKIE_SECRET);

        const res = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: signedCookie },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(401);
    });

    // 11 — expired JWT
    it("expired access JWT → /me 401", async () => {
        // Forja um JWT com `exp` no passado, assinado com ACCESS_SECRET correto.
        const nowSec = Math.floor(Date.now() / 1000);
        const expired = jwt.sign(
            {
                sub: "user-1",
                role: "ADMIN",
                iat: nowSec - 7200, // 2h atrás
                exp: nowSec - 3600, // 1h atrás
            },
            ACCESS_SECRET,
            { algorithm: "HS256", noTimestamp: true }
        );
        const signedCookie = signCookie(expired, COOKIE_SECRET);

        const res = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: signedCookie },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(401);
    });

    // 12 — passwordHash never in any successful response body
    it("passwordHash never in any successful response body", async () => {
        const reg = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: REGISTER_BODY,
            remoteAddress: uniqueIp(),
        });
        expect(reg.statusCode).toBe(201);
        expect(reg.body).not.toMatch(/passwordHash/i);

        const cookies = parseSetCookie(
            reg.headers["set-cookie"] as string | string[] | undefined
        );
        const accessSigned = cookies.access_token?.value ?? "";
        const refreshSigned = cookies.refresh_token?.value ?? "";

        const login = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: REGISTER_BODY.email,
                password: REGISTER_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });
        expect(login.statusCode).toBe(200);
        expect(login.body).not.toMatch(/passwordHash/i);

        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: accessSigned },
            remoteAddress: uniqueIp(),
        });
        expect(me.statusCode).toBe(200);
        expect(me.body).not.toMatch(/passwordHash/i);

        const refresh = await app.inject({
            method: "POST",
            url: "/api/auth/refresh",
            cookies: { refresh_token: refreshSigned },
            remoteAddress: uniqueIp(),
        });
        expect(refresh.statusCode).toBe(200);
        expect(refresh.body).not.toMatch(/passwordHash/i);
    });

    // 13 — passwordHash never in error response body
    it("passwordHash never in error response body", async () => {
        await registerUser();

        const wrong = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: REGISTER_BODY.email, password: "WrongPass1" },
            remoteAddress: uniqueIp(),
        });
        expect(wrong.statusCode).toBe(401);
        expect(wrong.body).not.toMatch(/passwordHash/i);

        const noUser = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "ghost@example.com", password: "AnyPass1" },
            remoteAddress: uniqueIp(),
        });
        expect(noUser.statusCode).toBe(401);
        expect(noUser.body).not.toMatch(/passwordHash/i);
    });

    // 14 — sanity: error response não vaza secrets/configs nem em test env
    it("error response in test env still hides nothing critical (no JWT secrets, no MONGO_URI)", async () => {
        const wrong = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: REGISTER_BODY.email, password: "WrongPass1" },
            remoteAddress: uniqueIp(),
        });
        // Mesmo em dev/test, a mensagem é a chave i18n; nunca vaza
        // segredos do env.
        expect(wrong.body).not.toMatch(/JWT_/i);
        expect(wrong.body).not.toMatch(/COOKIE_SECRET/i);
        expect(wrong.body).not.toMatch(/MONGO_URI/i);
        expect(wrong.body).not.toMatch(/mongodb:\/\//i);
    });
});
