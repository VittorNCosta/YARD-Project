import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import type { YardMovement } from "@/modules/yard/domain/yard-movement/entities/yard-movement";
import {
    type YardMovementActorMap,
    YardMovementPresenter,
} from "@/modules/yard/infra/yard-movement/presenter/yard-movement-presenter";
import { container } from "tsyringe";

export async function loadYardMovementActors(
    yardMovements: YardMovement[]
): Promise<YardMovementActorMap> {
    const ids = YardMovementPresenter.collectActorIds(yardMovements);
    const actors: YardMovementActorMap = new Map();

    if (ids.length === 0) {
        return actors;
    }

    const userRepository =
        container.resolve<UserRepository>("UserRepository");

    await Promise.all(
        ids.map(async (id) => {
            try {
                const user = await userRepository.findById(id);
                if (!user) {
                    return;
                }

                actors.set(id, {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                });
            } catch {
                // Mantem o ID bruto quando o valor legado nao e um ObjectId valido.
            }
        })
    );

    return actors;
}

