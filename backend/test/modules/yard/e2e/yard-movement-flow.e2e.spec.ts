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
import {
    cleanMongo,
    startMongo,
    stopMongo,
} from "@test/helpers/mongo-memory";

let app: FastifyInstance;

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

interface VehicleResponse {
    _id: string;
    plate: string;
    weighingRequired: boolean;
}

interface YardMovementResponse {
    id: string;
    vehicleId: string;
    plateSnapshot: string;
    status: string;
    weighingRequired: boolean;
    entryWeight?: number;
    exitWeight?: number;
    weightDifference?: number;
    dock?: string;
    releasedBy?: string;
    departureDate?: string;
    events: Array<{
        type: string;
        fromStatus?: string;
        toStatus: string;
        createdBy?: string;
    }>;
}

let ipCounter = 0;
function uniqueIp(): string {
    ipCounter += 1;
    const a = (ipCounter >> 8) & 0xff;
    const b = ipCounter & 0xff;
    return `10.201.${a}.${b}`;
}

async function registerAndGetCookies(): Promise<Record<string, string>> {
    const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
            name: "Yard Operator",
            email: `yard.operator.${ipCounter}@example.com`,
            password: "Password1",
        },
        remoteAddress: uniqueIp(),
    });

    expect(res.statusCode).toBe(201);
    const cookies = parseSetCookie(
        res.headers["set-cookie"] as string | string[] | undefined
    );
    const accessToken = cookies.access_token?.value;
    if (!accessToken) throw new Error("missing access_token cookie");

    return { access_token: accessToken };
}

async function updateStatus(
    id: string,
    cookies: Record<string, string>,
    payload: Record<string, unknown>
): Promise<YardMovementResponse> {
    const res = await app.inject({
        method: "PATCH",
        url: `/api/yard-movements/${id}/status`,
        cookies,
        payload,
        remoteAddress: uniqueIp(),
    });

    expect(res.statusCode).toBe(200);
    return (res.json() as ApiResponse<YardMovementResponse>).data;
}

describe("Yard movement operational flow (E2E)", () => {
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

    it("creates a weighted movement and advances it until finished", async () => {
        const cookies = await registerAndGetCookies();

        const vehicleRes = await app.inject({
            method: "POST",
            url: "/api/vehicles",
            cookies,
            payload: {
                plate: "E2E-1234",
                driverName: "Joao Motorista",
                driverCpf: "12345678900",
                cargoType: "Carga geral",
                status: "No patio",
                vehicleType: "Truck",
                weighingRequired: true,
                activeStatus: "Ativo",
            },
            remoteAddress: uniqueIp(),
        });
        expect(vehicleRes.statusCode).toBe(201);
        const vehicle = (vehicleRes.json() as ApiResponse<VehicleResponse>)
            .data;
        expect(vehicle.weighingRequired).toBe(true);

        const dockRes = await app.inject({
            method: "POST",
            url: "/api/docks",
            cookies,
            payload: {
                code: "D01",
                name: "Doca 01",
            },
            remoteAddress: uniqueIp(),
        });
        expect(dockRes.statusCode).toBe(201);

        const movementRes = await app.inject({
            method: "POST",
            url: "/api/yard-movements",
            cookies,
            payload: {
                vehicleId: vehicle._id,
                driverName: "Joao Motorista",
                driverCpf: "12345678900",
                cargoType: "Carga geral",
                processType: "Carga",
            },
            remoteAddress: uniqueIp(),
        });
        expect(movementRes.statusCode).toBe(201);
        let movement = (
            movementRes.json() as ApiResponse<YardMovementResponse>
        ).data;

        expect(movement.vehicleId).toBe(vehicle._id);
        expect(movement.plateSnapshot).toBe("E2E-1234");
        expect(movement.status).toBe("WAITING_QUEUE");
        expect(movement.weighingRequired).toBe(true);
        expect(movement.weightDifference).toBeUndefined();

        movement = await updateStatus(movement.id, cookies, {
            status: "GATE_CHECK",
        });
        expect(movement.status).toBe("GATE_CHECK");

        movement = await updateStatus(movement.id, cookies, {
            status: "ENTRY_WEIGHING",
        });
        expect(movement.status).toBe("ENTRY_WEIGHING");

        movement = await updateStatus(movement.id, cookies, {
            status: "YARD",
            entryWeight: 12000,
        });
        expect(movement.status).toBe("YARD");
        expect(movement.entryWeight).toBe(12000);

        movement = await updateStatus(movement.id, cookies, {
            status: "DOCKED",
            dock: "D01",
        });
        expect(movement.status).toBe("DOCKED");
        expect(movement.dock).toBe("D01");

        movement = await updateStatus(movement.id, cookies, {
            status: "AWAITING_RELEASE",
        });
        expect(movement.status).toBe("AWAITING_RELEASE");
        expect(movement.dock).toBeUndefined();

        movement = await updateStatus(movement.id, cookies, {
            status: "EXIT_WEIGHING",
        });
        expect(movement.status).toBe("EXIT_WEIGHING");

        movement = await updateStatus(movement.id, cookies, {
            status: "RELEASED",
            exitWeight: 11800,
        });
        expect(movement.status).toBe("RELEASED");
        expect(movement.exitWeight).toBe(11800);
        expect(movement.weightDifference).toBe(-200);
        expect(movement.releasedBy).toBeDefined();

        movement = await updateStatus(movement.id, cookies, {
            status: "FINISHED",
        });
        expect(movement.status).toBe("FINISHED");
        expect(movement.departureDate).toBeDefined();
        expect(movement.events.map((event) => event.toStatus)).toEqual([
            "WAITING_QUEUE",
            "GATE_CHECK",
            "ENTRY_WEIGHING",
            "YARD",
            "DOCKED",
            "AWAITING_RELEASE",
            "EXIT_WEIGHING",
            "RELEASED",
            "FINISHED",
        ]);
    });
});
