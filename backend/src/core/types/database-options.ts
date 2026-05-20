/**
 * Opções de banco repassadas por use cases/repositórios para participar de
 * transações, sessões ou leituras consistentes.
 *
 * Intencionalmente vazio nesta fase: Mongoose suporta transações apenas via
 * `ClientSession` em replica sets. O cluster Atlas do projeto já é um replica
 * set, mas enquanto não há cenário multi-documento/multi-coleção que exija
 * transação, mantemos o contrato estável sem campos obrigatórios — futura
 * adição de `session?: ClientSession` não quebra chamadas atuais.
 */
export interface DatabaseOptions {
    // Reservado para ClientSession/transações futuras.
}
