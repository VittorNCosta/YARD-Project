import type { FastifyInstance } from "fastify";

import { CreateYardMovementController } from "@/modules/yard/infra/yard-movement/controllers/create/create-yard-movement.controller";
import { FindYardMovementByIdController } from "@/modules/yard/infra/yard-movement/controllers/find-by-id/find-yard-movement-by-id.controller";
import { ListYardMovementController } from "@/modules/yard/infra/yard-movement/controllers/list/list-yard-movement.controller";
import { UpdateYardMovementStatusController } from "@/modules/yard/infra/yard-movement/controllers/update-status/update-yard-movement-status.controller";

export async function yardMovementRoutes(
    app: FastifyInstance
): Promise<void> {
    const createController = new CreateYardMovementController();
    const listController = new ListYardMovementController();
    const findByIdController = new FindYardMovementByIdController();
    const updateStatusController = new UpdateYardMovementStatusController();

    app.post("/yard-movements", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => createController.handle(req, reply),
    });

    app.get("/yard-movements", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => listController.handle(req, reply),
    });

    app.get("/yard-movements/:id", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => findByIdController.handle(req, reply),
    });

    app.patch("/yard-movements/:id/status", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => updateStatusController.handle(req, reply),
    });
}
