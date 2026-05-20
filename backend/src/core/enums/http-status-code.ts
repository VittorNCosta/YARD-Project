/**
 * Códigos HTTP padronizados usados pela camada de infra (controllers, error handler).
 * Alinhado com o STYLE_GUIDE — deve ser o único enum de status HTTP no backend.
 */
enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,

    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,

    INTERNAL_SERVER_ERROR = 500,
}

export default HttpStatusCode;
