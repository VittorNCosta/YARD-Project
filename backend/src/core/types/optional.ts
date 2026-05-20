/**
 * Torna opcionais as chaves `K` do tipo `T`, mantendo o resto obrigatório.
 * Usado em factories de entidades (`Entity.create(props)`).
 */
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> &
    Omit<T, K>;
