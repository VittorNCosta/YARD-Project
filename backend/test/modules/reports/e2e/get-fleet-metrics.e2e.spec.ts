import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { UserModel } from "@/modules/user/infra/user/database/schemas/user.schema";
import { VehicleModel } from "@/modules/vehicle/infra/vehicle/database/schemas/vehicle.schema";
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
import { parseSetCookie } from "@test/helpers/http-cookies";
import { cleanMongo, startMongo, stopMongo } from "@test/helpers/mongo-memory";

/**
 * E2E do endpoint GET /api/reports/fleet.
 *
 * Cobre:
 * - 401 sem cookie de autenticação.
 * - 400 quando `from > to`.
 * - 400 quando query traz campo extra (`.strict()`).
 * - 200 com payload agregado a partir de veículos seedados.
 * - usersByRole presente apenas quando o solicitante é admin.
 */

let app: FastifyInstance;

const USER_BODY = {
    name: "Reporter User",
    email: "reporter.user@example.com",
    password: "Password1",
} as const;

const ADMIN_BODY = {
    name: "Reporter Admin",
    email: "reporter.admin@example.com",
    password: "Password1",
} as const;

let ipCounter = 0;
function uniqueIp(): string {
    ipCounter += 1;
    const a = (ipCounter >> 8) & 0xff;
    const b = ipCounter & 0xff;
    return `10.45.${a}.${b}`;
}

async function registerAndExtractCookies(body: {
    name: string;
    email: string;
    password: string;
}): Promise<string> {
    const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: body,
        remoteAddress: uniqueIp(),
    });
    if (res.statusCode !== 201) {
        throw new Error(`register failed: ${res.statusCode} ${res.body}`);
    }

    const cookies = parseSetCookie(
        res.headers["set-cookie"] as string | string[] | undefined
    );
    const access = cookies.access_token?.value;
    if (!access) throw new Error("missing access_token cookie");
    return access;
}

/**
 * Promove o usuário ao papel ADMIN diretamente no Mongo.
 * O `RegisterUseCase` sempre cria USER — para validar `usersByRole`
 * (restrito a admin) precisamos elevar manualmente.
 */
async function promoteToAdmin(email: string): Promise<void> {
    await UserModel.updateOne({ email }, { $set: { role: UserRole.ADMIN } });
}

async function seedVehicles(): Promise<void> {
    await VehicleModel.create([
        {
            plate: "AAA-1111",
            driverName: "Joao",
            cargoType: "Geral",
            status: "Ativo",
            vehicleType: "Truck",
            activeStatus: "Ativo",
            weighingRequired: true,
            createdAt: new Date("2024-05-10T10:00:00Z"),
            updatedAt: new Date("2024-05-10T10:00:00Z"),
        },
        {
            plate: "BBB-2222",
            driverName: "Maria",
            cargoType: "Geral",
            status: "Ativo",
            vehicleType: "Truck",
            activeStatus: "Ativo",
            weighingRequired: false,
            createdAt: new Date("2024-05-11T10:00:00Z"),
            updatedAt: new Date("2024-05-11T10:00:00Z"),
        },
        {
            plate: "CCC-3333",
            driverName: "Pedro",
            cargoType: "Geral",
            status: "Ativo",
            vehicleType: "Van",
            activeStatus: "Inativo",
            weighingRequired: true,
            createdAt: new Date("2024-06-15T10:00:00Z"),
            updatedAt: new Date("2024-06-15T10:00:00Z"),
        },
    ]);
}

describe("GET /api/reports/fleet (E2E)", () => {
    beforeAll(async () => {
        await startMongo();
        app = await buildTestApp();
        await UserModel.syncIndexes();
    });

    afterAll(async () => {
        await app.close();
        await stopMongo();
    });

    beforeEach(async () => {
        await cleanMongo();
    });

    it("401 when called without authentication cookie", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/reports/fleet",
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(401);
    });

    it("200 returns the FleetReport envelope with KPIs", async () => {
        const access = await registerAndExtractCookies(USER_BODY);
        await seedVehicles();

        const res = await app.inject({
            method: "GET",
            url: "/api/reports/fleet",
            cookies: { access_token: access },
            remoteAddress: uniqueIp(),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json() as {
            success: boolean;
            data: {
                kpis: {
                    totalVehicles: number;
                    activePercentage: number;
                    weighingRequiredPercentage: number;
                    distinctVehicleTypes: number;
                };
                composition: {
                    byVehicleType: Array<{ key: string; count: number }>;
                    byActiveStatus: Array<{ key: string; count: number }>;
                    byWeighingRequired: Array<{
                        key: string;
                        count: number;
                    }>;
                };
                registrationsByMonth: Array<{
                    month: string;
                    count: number;
                }>;
                usersByRole?: unknown;
            };
        };

        expect(body.success).toBe(true);
        expect(body.data.kpis.totalVehicles).toBe(3);
        expect(body.data.kpis.distinctVehicleTypes).toBe(2);
        // 2 ativos de 3 = 67 (round)
        expect(body.data.kpis.activePercentage).toBe(67);

        // Default user NÃO deve ter usersByRole no payload.
        expect(body.data.usersByRole).toBeUndefined();

        const truck = body.data.composition.byVehicleType.find(
            (b) => b.key === "Truck"
        );
        expect(truck?.count).toBe(2);
    });

    it("200 includes usersByRole when caller is admin", async () => {
        const access = await registerAndExtractCookies(ADMIN_BODY);
        await promoteToAdmin(ADMIN_BODY.email);

        // Após promover, o JWT antigo ainda traz role=user — refazemos login.
        // Mais simples: logar de novo para emitir token com role atualizado.
        const loginRes = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: ADMIN_BODY.email,
                password: ADMIN_BODY.password,
            },
            remoteAddress: uniqueIp(),
        });
        expect(loginRes.statusCode).toBe(200);
        const cookies = parseSetCookie(
            loginRes.headers["set-cookie"] as string | string[] | undefined
        );
        const adminAccess = cookies.access_token?.value;
        if (!adminAccess) throw new Error("missing admin cookie");

        await seedVehicles();

        const res = await app.inject({
            method: "GET",
            url: "/api/reports/fleet",
            cookies: { access_token: adminAccess },
            remoteAddress: uniqueIp(),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json() as {
            data: {
                usersByRole?: Array<{ role: string; count: number }>;
            };
        };
        expect(Array.isArray(body.data.usersByRole)).toBe(true);
        const adminBucket = body.data.usersByRole?.find(
            (b) => b.role === "admin"
        );
        expect(adminBucket?.count).toBe(1);

        // Discard - apenas pra silenciar `access` não usado
        void access;
    });

    it("400 when 'from' is after 'to'", async () => {
        const access = await registerAndExtractCookies({
            ...USER_BODY,
            email: "rep.range@example.com",
        });

        const res = await app.inject({
            method: "GET",
            url:
                "/api/reports/fleet?" +
                "from=2024-12-01T00:00:00Z&to=2024-01-01T00:00:00Z",
            cookies: { access_token: access },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });

    it("400 when query has unknown field (.strict)", async () => {
        const access = await registerAndExtractCookies({
            ...USER_BODY,
            email: "rep.strict@example.com",
        });

        const res = await app.inject({
            method: "GET",
            url: "/api/reports/fleet?unknown=1",
            cookies: { access_token: access },
            remoteAddress: uniqueIp(),
        });
        expect(res.statusCode).toBe(400);
    });
});
