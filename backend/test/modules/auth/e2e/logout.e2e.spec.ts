import { SessionModel } from "@/modules/auth/infra/auth/database/schemas/session.schema";
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
    decodeJwtPayload,
    parseSetCookie,
    splitSignedCookie,
} from "@test/helpers/http-cookies";
import {
    cleanMongo,
    startMongo,
    stopMongo,
} from "@test/helpers/mongo-memory";

let app: FastifyInstance;

const REGISTER_BODY = {
    name: "Cara Logout",
    email: "cara.logout@example.com",
    password: "Password1",
} as const;

let ipCounter = 0;
function uniqueIp(): string {
    ipCounter += 1;
    const a = (ipCounter >> 8) & 0xff;
    const b = ipCounter & 0xff;
    return `10.222.${a}.${b}`;
}

async function registerAndLogin(): Promise<{
    accessSigned: string;
    refreshSigned: string;
}> {
    const reg = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: REGISTER_BODY,
        remoteAddress: uniqueIp(),
    });
    if (reg.statusCode !== 201) {
        throw new Error(`register failed: ${reg.statusCode} ${reg.body}`);
    }
    const cookies = parseSetCookie(
        reg.headers["set-cookie"] as string | string[] | undefined
    );
    const access = cookies.access_token?.value;
    const refresh = cookies.refresh_token?.value;
    if (!access || !refresh) throw new Error("missing cookies after register");
    return { accessSigned: access, refreshSigned: refresh };
}

describe("POST /api/auth/logout (E2E)", () => {
    beforeAll(async () => {
        await startMongo();
        app = await buildTestApp();
        await SessionModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    it("logout 200 clears both cookies and revokes session", async () => {
        const { refreshSigned } = await registerAndLogin();
        const { value: rawJwt } = splitSignedCookie(refreshSigned);
        const payload = decodeJwtPayload<{ sub: string; sid: string }>(rawJwt);

        const res = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
            cookies: { refresh_token: refreshSigned },
            remoteAddress: uniqueIp(),
        });

        expect(res.statusCode).toBe(200);

        // session foi revogada no DB.
        const sessionDoc = await SessionModel.findById(payload.sid).lean();
        expect(sessionDoc).not.toBeNull();
        expect(sessionDoc?.revokedAt).toBeInstanceOf(Date);

        // ambos os cookies foram clearados (Max-Age=0 / Expires no passado).
        const cookies = parseSetCookie(
            res.headers["set-cookie"] as string | string[] | undefined
        );
        expect(cookies.access_token).toBeDefined();
        expect(cookies.refresh_token).toBeDefined();
        // A clearCookie do @fastify/cookie seta Max-Age=0 e Expires=epoch
        const accessAttrs = cookies.access_token?.attrs;
        const refreshAttrs = cookies.refresh_token?.attrs;
        expect(
            accessAttrs?.["max-age"] === "0" || accessAttrs?.expires
        ).toBeTruthy();
        expect(
            refreshAttrs?.["max-age"] === "0" || refreshAttrs?.expires
        ).toBeTruthy();
    });

    it("logout idempotent — second call without cookie still 200", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(200);
    });

    it("me after logout returns 401 (cookies clearados)", async () => {
        const { accessSigned, refreshSigned } = await registerAndLogin();

        // Sanity: /me com cookie válido devolve 200
        const meBefore = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            cookies: { access_token: accessSigned },
            remoteAddress: uniqueIp(),
        });
        expect(meBefore.statusCode).toBe(200);

        // Logout consome o refresh, revoga session e limpa cookies.
        const out = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
            cookies: { refresh_token: refreshSigned },
            remoteAddress: uniqueIp(),
        });
        expect(out.statusCode).toBe(200);

        // O cliente, na vida real, perderia os cookies clearados. No
        // teste, simulamos isso NÃO mandando cookies na próxima request.
        const meAfter = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            remoteAddress: uniqueIp(),
        });
        expect(meAfter.statusCode).toBe(401);
    });
});
