/**
 * Carrega os providers (bindings tsyringe) por efeito colateral.
 * Precisa ser chamado ANTES de qualquer `container.resolve()` — por isso
 * fica isolado em uma função dedicada, mesmo sendo um import puro.
 */
export async function setupProviders(): Promise<void> {
    await import("@/infra/providers");
}
