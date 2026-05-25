/**
 * Barrel de providers da aplicação.
 *
 * Cada módulo importa aqui o seu `*.provider.ts`, que executa chamadas
 * `container.registerSingleton(...)` por efeito colateral. Importar este
 * arquivo no boot do servidor garante que todos os bindings tsyringe
 * estejam prontos antes de resolver qualquer use case.
 *
 * Ordem importa: módulos cujo provider depende de outros (ex.: auth usa
 * `UserRepository`) devem ser carregados depois das suas dependências.
 */
import "@/modules/user/infra/user/providers/user.provider";
import "@/modules/auth/infra/auth/providers/auth.provider";
import "@/modules/vehicle/infra/vehicle/providers/vehicle.provider";
import "@/modules/yard/infra/dock/providers/dock.provider";
import "@/modules/yard/infra/yard-movement/providers/yard-movement.provider";
