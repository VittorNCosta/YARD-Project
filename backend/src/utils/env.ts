// src/utils/env.ts
/**
 * Retorna uma variável de ambiente obrigatória.
 * Se não estiver definida, lança erro imediatamente.
 * Isso resolve o problema de TS com `string | undefined`.
 */
export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Variável de ambiente "${name}" não definida no .env`);
  }
  return value;
}
