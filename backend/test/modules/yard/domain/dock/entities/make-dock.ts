import { Dock } from "@/modules/yard/domain/dock/entities/dock";

export function makeDock(
    override: Partial<Parameters<typeof Dock.create>[0]> = {}
): Dock {
    return Dock.create({
        code: "Doca 1",
        ...override,
    });
}

