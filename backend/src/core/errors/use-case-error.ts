import HttpStatusCode from "@/core/enums/http-status-code";

/**
 * Erro de regra de negócio lançado por use cases.
 *
 * - `key`: identificador i18n (ex.: "vehicle.not-found"). O handler resolve
 *   para a mensagem no idioma ativo.
 * - `statusCode`: código HTTP associado (padrão 400).
 *
 * O error-handler global traduz instâncias desta classe em respostas JSON.
 */
export class UseCaseError extends Error {
    public readonly key: string;
    public readonly statusCode: HttpStatusCode;

    constructor(
        key: string,
        statusCode: HttpStatusCode = HttpStatusCode.BAD_REQUEST
    ) {
        super(key);
        this.name = "UseCaseError";
        this.key = key;
        this.statusCode = statusCode;
    }
}
