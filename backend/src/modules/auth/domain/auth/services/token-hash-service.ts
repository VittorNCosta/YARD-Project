/**
 * Hash síncrono de tokens aleatórios opacos (password-reset, e futuros
 * one-time tokens). Distinto de `HashService` (bcrypt p/ senhas) por design:
 *
 * - Token é entropia de 256 bits — não precisa de KDF lento.
 * - Bcrypt no path de reset vira DoS amplifier (F-05).
 * - HMAC-SHA-256 com pepper resolve ambos: rápido + resistente a lookup
 *   por hash sem o pepper (evita rainbow tables se o DB vazar).
 *
 * Implementação concreta: `Sha256TokenHashService` em infra/.
 */
export abstract class TokenHashService {
    abstract hash(plain: string): string;
}
