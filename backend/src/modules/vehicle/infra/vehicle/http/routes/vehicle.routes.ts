import type { FastifyInstance } from "fastify";

import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { CreateVehicleController } from "@/modules/vehicle/infra/vehicle/controllers/create/create-vehicle.controller";
import { DeleteVehicleController } from "@/modules/vehicle/infra/vehicle/controllers/delete/delete-vehicle.controller";
import { FindVehicleByIdController } from "@/modules/vehicle/infra/vehicle/controllers/find-by-id/find-vehicle-by-id.controller";
import { ListVehicleController } from "@/modules/vehicle/infra/vehicle/controllers/list/list-vehicle.controller";
import { UpdateVehicleController } from "@/modules/vehicle/infra/vehicle/controllers/update/update-vehicle.controller";
import { UpdateVehicleStatusController } from "@/modules/vehicle/infra/vehicle/controllers/update-status/update-vehicle-status.controller";

/**
 * Rotas Fastify do módulo Vehicle.
 *
 *   POST   /vehicles               (autenticado)
 *   GET    /vehicles               (autenticado)
 *   GET    /vehicles/:id           (autenticado)
 *   PUT    /vehicles/:id           (autenticado)
 *   PUT    /vehicles/:id/status    (autenticado)
 *   DELETE /vehicles/:id           (autenticado + admin)
 *
 * O prefixo `/api` é aplicado por `infra/http/app.ts` via `registerRoutes`.
 */
export async function vehicleRoutes(app: FastifyInstance): Promise<void> {
    const createController = new CreateVehicleController();
    const listController = new ListVehicleController();
    const findByIdController = new FindVehicleByIdController();
    const updateController = new UpdateVehicleController();
    const updateStatusController = new UpdateVehicleStatusController();
    const deleteController = new DeleteVehicleController();

    app.post("/vehicles", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => createController.handle(req, reply),
    });

    app.get("/vehicles", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => listController.handle(req, reply),
    });

    app.get("/vehicles/:id", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => findByIdController.handle(req, reply),
    });

    app.put("/vehicles/:id", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => updateController.handle(req, reply),
    });

    app.put("/vehicles/:id/status", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => updateStatusController.handle(req, reply),
    });

    app.delete("/vehicles/:id", {
        onRequest: [
            app.ensureAuthenticated,
            app.ensureRole(UserRole.ADMIN),
        ],
        handler: (req, reply) => deleteController.handle(req, reply),
    });
}
