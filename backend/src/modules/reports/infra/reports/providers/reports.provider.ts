/**
 * Bindings tsyringe do módulo Reports.
 *
 * O módulo é read-only e usa exclusivamente repositórios de outros módulos
 * (`VehicleRepository`, `UserRepository`) — já registrados pelos providers
 * de origem. Nenhum binding novo é necessário aqui hoje.
 *
 * O arquivo existe para manter a convenção do STYLE_GUIDE (cada módulo
 * tem um provider, importado por `infra/providers/index.ts`). Bindings
 * futuros do módulo (ex.: cache de relatórios) entram aqui.
 */
export {};
