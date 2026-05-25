import { YardMovementRepository } from "@/modules/yard/domain/yard-movement/repositories/yard-movement-repository";
import { MongoYardMovementRepository } from "@/modules/yard/infra/yard-movement/database/repositories/mongo-yard-movement-repository";
import { container } from "tsyringe";

container.registerSingleton<YardMovementRepository>(
    "YardMovementRepository",
    MongoYardMovementRepository
);
