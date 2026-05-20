import type { DatabaseOptions } from "@/core/types/database-options";
import type { User } from "@/modules/user/domain/user/entities/user";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { inject, injectable } from "tsyringe";

export interface ListUserUseCaseRequest {
    page?: number;
    perPage?: number;
    q?: string;
    databaseOptions?: DatabaseOptions;
}

export interface ListUserUseCaseResponse {
    items: User[];
    total: number;
    page: number;
    perPage: number;
}

@injectable()
export class ListUserUseCase {
    constructor(
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute(
        request: ListUserUseCaseRequest = {}
    ): Promise<ListUserUseCaseResponse> {
        const page = Math.max(1, Math.floor(request.page ?? 1));
        const perPage = Math.min(100, Math.max(1, Math.floor(request.perPage ?? 20)));
        const q = request.q?.trim();

        const [items, total] = await Promise.all([
            this.userRepository.findMany(
                { page, perPage, q },
                request.databaseOptions
            ),
            this.userRepository.count({ q }, request.databaseOptions),
        ]);

        return { items, total, page, perPage };
    }
}
