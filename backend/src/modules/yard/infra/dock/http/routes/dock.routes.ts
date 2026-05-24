import type { FastifyInstance } from "fastify";

import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { CreateDockController } from "@/modules/yard/infra/dock/controllers/create/create-dock.controller";
import { DeleteDockController } from "@/modules/yard/infra/dock/controllers/delete/delete-dock.controller";
import { FindDockByIdController } from "@/modules/yard/infra/dock/controllers/find-by-id/find-dock-by-id.controller";
import { ListDockController } from "@/modules/yard/infra/dock/controllers/list/list-dock.controller";
import { UpdateDockController } from "@/modules/yard/infra/dock/controllers/update/update-dock.controller";

export async function dockRoutes(app: FastifyInstance): Promise<void> {
    const createController = new CreateDockController();
    const listController = new ListDockController();
    const findByIdController = new FindDockByIdController();
    const updateController = new UpdateDockController();
    const deleteController = new DeleteDockController();

    app.post("/docks", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => createController.handle(req, reply),
    });

    app.get("/docks", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => listController.handle(req, reply),
    });

    app.get("/docks/:id", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => findByIdController.handle(req, reply),
    });

    app.put("/docks/:id", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => updateController.handle(req, reply),
    });

    app.delete("/docks/:id", {
        onRequest: [app.ensureAuthenticated, app.ensureRole(UserRole.ADMIN)],
        handler: (req, reply) => deleteController.handle(req, reply),
    });
}

