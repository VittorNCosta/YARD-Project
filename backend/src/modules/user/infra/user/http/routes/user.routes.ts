import type { FastifyInstance } from "fastify";

import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { CreateUserController } from "@/modules/user/infra/user/controllers/create/create-user.controller";
import { DeleteUserController } from "@/modules/user/infra/user/controllers/delete/delete-user.controller";
import { FindUserByIdController } from "@/modules/user/infra/user/controllers/find-by-id/find-user-by-id.controller";
import { ListUserController } from "@/modules/user/infra/user/controllers/list/list-user.controller";
import { UpdateUserController } from "@/modules/user/infra/user/controllers/update/update-user.controller";
import { UpdateUserRoleController } from "@/modules/user/infra/user/controllers/update-role/update-user-role.controller";

/**
 * Rotas do módulo User.
 *
 *   POST   /users           — admin only
 *   GET    /users           — admin only (paginação + busca via querystring)
 *   GET    /users/:id       — admin OU o próprio user (validado no controller)
 *   PUT    /users/:id       — admin only (auto-update do próprio user fica para fase futura)
 *   PATCH  /users/:id/role  — admin only
 *   DELETE /users/:id       — admin only
 *
 * Prefixo `/api` aplicado pelo barrel `infra/http/routes/index.ts`.
 */
export async function userRoutes(app: FastifyInstance): Promise<void> {
    const createController = new CreateUserController();
    const listController = new ListUserController();
    const findByIdController = new FindUserByIdController();
    const updateController = new UpdateUserController();
    const updateRoleController = new UpdateUserRoleController();
    const deleteController = new DeleteUserController();

    app.post("/users", {
        onRequest: [
            app.ensureAuthenticated,
            app.ensureRole(UserRole.ADMIN),
        ],
        handler: (req, reply) => createController.handle(req, reply),
    });

    app.get("/users", {
        onRequest: [
            app.ensureAuthenticated,
            app.ensureRole(UserRole.ADMIN),
        ],
        handler: (req, reply) => listController.handle(req, reply),
    });

    app.get("/users/:id", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => findByIdController.handle(req, reply),
    });

    app.put("/users/:id", {
        onRequest: [
            app.ensureAuthenticated,
            app.ensureRole(UserRole.ADMIN),
        ],
        handler: (req, reply) => updateController.handle(req, reply),
    });

    app.patch("/users/:id/role", {
        onRequest: [
            app.ensureAuthenticated,
            app.ensureRole(UserRole.ADMIN),
        ],
        handler: (req, reply) => updateRoleController.handle(req, reply),
    });

    app.delete("/users/:id", {
        onRequest: [
            app.ensureAuthenticated,
            app.ensureRole(UserRole.ADMIN),
        ],
        handler: (req, reply) => deleteController.handle(req, reply),
    });
}
