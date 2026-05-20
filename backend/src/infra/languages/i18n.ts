import i18next from "i18next";

import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";

/**
 * Inicializa o i18next com os três idiomas suportados.
 * Idempotente: chamadas subsequentes retornam a mesma instância.
 *
 * Convenção: as chaves seguem o formato `<domínio>.<mensagem>` e
 * devem ser iguais em todos os idiomas.
 */
let initialized = false;

export async function setupI18n(): Promise<void> {
    if (initialized) {
        return;
    }

    await i18next.init({
        fallbackLng: "pt",
        supportedLngs: ["en", "es", "pt"],
        defaultNS: "translation",
        resources: {
            en: { translation: en },
            es: { translation: es },
            pt: { translation: pt },
        },
        interpolation: {
            escapeValue: false,
        },
    });

    initialized = true;
}

export { i18next };
