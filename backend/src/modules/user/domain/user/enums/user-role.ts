/**
 * Papéis de RBAC suportados.
 *
 * Mantemos como `string` (não numérico) para alinhar com o payload do JWT
 * e com a apresentação direta na resposta HTTP — sem necessidade de mapper.
 */
export enum UserRole {
    ADMIN = "admin",
    USER = "user",
}
