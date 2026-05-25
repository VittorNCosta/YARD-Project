import { DockRepository } from "@/modules/yard/domain/dock/repositories/dock-repository";
import { MongoDockRepository } from "@/modules/yard/infra/dock/database/repositories/mongo-dock-repository";
import { container } from "tsyringe";

container.registerSingleton<DockRepository>(
    "DockRepository",
    MongoDockRepository
);

