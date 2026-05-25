import "reflect-metadata";
import "@/config/env";

import { disconnectMongo, connectMongo } from "@/infra/database/mongo/mongo-connection";
import { DockStatus } from "@/modules/yard/domain/dock/enums/dock-status";
import { normalizeDockCode } from "@/modules/yard/infra/dock/database/mappers/mongo-dock-mapper";
import { DockModel } from "@/modules/yard/infra/dock/database/schemas/dock.schema";

const DEFAULT_DOCKS = [
    { code: "Doca 1", name: "Recebimento 1" },
    { code: "Doca 2", name: "Recebimento 2" },
    { code: "Doca 3", name: "Expedicao 1" },
    { code: "Doca 4", name: "Expedicao 2" },
    { code: "Doca 5", name: "Reserva operacional" },
];

async function seedDocks(): Promise<void> {
    await connectMongo();

    for (const dock of DEFAULT_DOCKS) {
        const normalizedCode = normalizeDockCode(dock.code);
        await DockModel.updateOne(
            { normalizedCode },
            {
                $setOnInsert: {
                    code: dock.code,
                    normalizedCode,
                    name: dock.name,
                    status: DockStatus.ACTIVE,
                },
            },
            { upsert: true }
        ).exec();
    }

    console.log(`[seed:docks] ${DEFAULT_DOCKS.length} docas verificadas.`);
}

seedDocks()
    .catch((error) => {
        console.error("[seed:docks] falha ao executar:", error);
        process.exitCode = 1;
    })
    .finally(() => {
        void disconnectMongo();
    });

