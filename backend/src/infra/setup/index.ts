import { setupI18n } from "@/infra/languages/i18n";

import { setupDatabase } from "./setup-database";
import { setupProviders } from "./setup-providers";

/**
 * Orquestra o bootstrapping da aplicação.
 *
 * Ordem importa:
 *   1. i18n (erros de startup podem ser traduzidos).
 *   2. providers (tsyringe precisa estar pronto antes de qualquer resolve).
 *   3. banco de dados.
 */
export async function setupApplication(): Promise<void> {
    await setupI18n();
    await setupProviders();
    await setupDatabase();
}
