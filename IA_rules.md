# AI Rules - Project Standards

> Regras obrigatórias para qualquer agente ou contribuidor (humano ou IA) que gere código, documentação ou artefatos neste repositório.

Este documento é o **ponto de entrada único** dos padrões do projeto. Ele não substitui, apenas resume e torna obrigatórios os dois guias canônicos:

- **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** — padrões de código, nomenclatura, camadas, testes e qualidade.
- **[FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)** — organização de pastas, módulos e entidades.

Em caso de conflito entre este arquivo e os MDs canônicos, **prevalecem os MDs canônicos** (mais detalhados e versionados).

---

## 1. Arquitetura obrigatória

O projeto segue **DDD (Domain-Driven Design)** com **Clean Architecture**.

Três camadas, e apenas três:

- `domain/` — regras de negócio, entidades, enums, interfaces de repositórios.
- `application/` — casos de uso (orquestração).
- `infra/` — controllers, HTTP, banco de dados, providers, adaptadores externos.

**Regra de dependência** (sentido único, para dentro):

```
infra → application → domain
```

- `domain` **nunca** importa de `application` ou `infra`.
- `application` **nunca** importa de `infra`.
- Inversão de dependências via interfaces/abstract classes em `domain`.

---

## 2. Regras inegociáveis

- Lógica de negócio mora em **entidades** ou **casos de uso** — **nunca** em controllers.
- Controllers **apenas**: validam entrada (Zod), resolvem o use case do container DI, retornam HTTP.
- Repositórios são **abstract classes** em `domain/`; implementações concretas ficam em `infra/`.
- **Injeção de dependências via `tsyringe`** (`@injectable()`, `@inject()`).
- **Validação de entrada com Zod** em todo endpoint.
- **Zero `any`**. Tipagem estrita do TypeScript.
- **Sem código morto** ou feature-flags especulativas.

---

## 3. Padrões de implementação

### Entidades
- Constructor **privado**.
- Criação via método estático `create(props)`.
- Aplicar defaults no `create()`.
- Usar `Optional<T, K>` para campos opcionais.

### Use Cases
- Classe decorada com `@injectable()`.
- Interface `<UseCase>Request` para entrada, type `<UseCase>Response` para saída.
- Método público único: `async execute(request)`.
- Dependências injetadas via constructor com `@inject()`.
- Aceitar `databaseOptions?: DatabaseOptions` para participar de transações.

### Controllers
- Classe com método `async handle(request, reply)`.
- Resolvem o use case com `container.resolve()` (não injetar no constructor).
- Um controller por ação (`create`, `update`, `delete`, `find-by-id`, `list`, etc.).

### Repositórios (infra)
- `extends` da abstract class do domínio.
- Prefixar com o banco: `Mongo<Entity>Repository`, etc.
- Converter entre DB e domínio via **mappers** (`toDomain` / `toPersistency`).

---

## 4. Estrutura de pastas (resumo)

```
src/modules/<module>/
├── domain/<entity>/
│   ├── entities/
│   ├── enums/
│   ├── repositories/
│   └── languages/
├── application/<entity>/
│   └── use-cases/<action>/
└── infra/<entity>/
    ├── controllers/<action>/
    ├── database/{repositories,mappers}/
    ├── http/routes/
    └── presenter/
```

Detalhes completos em [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md).

---

## 5. Nomenclatura

| Item | Convenção | Exemplo |
|---|---|---|
| Arquivos e diretórios | `kebab-case` | `create-location-use-case.ts` |
| Classes | `PascalCase` | `Location` |
| Use Cases | `<Verb><Entity>UseCase` | `CreateLocationUseCase` |
| Controllers | `<Verb><Entity>Controller` | `CreateLocationController` |
| Repositório (interface) | `<Entity>Repository` | `LocationRepository` |
| Repositório (impl) | `<DB><Entity>Repository` | `MongoLocationRepository` |
| Mapper | `<DB><Entity>Mapper` | `MongoLocationMapper` |
| Presenter | `<Entity>Presenter` | `LocationPresenter` |
| Schema Zod | `*.schema.ts` | `create-location.schema.ts` |
| Testes | `*.spec.ts` | `create-location-use-case.spec.ts` |
| Enums | `PascalCase` | `LocationStatus` |
| Variáveis | `camelCase` | `locationName` |
| Constantes globais | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |

---

## 6. Testes

- Testes unitários em `test/` espelhando `src/`.
- SUT (System Under Test) sempre nomeado `sut`.
- Usar repositórios **in-memory** para unit tests.
- Factories em `make<Entity>()` com parâmetro `override?`.
- Descrição de teste: `"should be able to ..."`.
- Testes E2E rodam contra banco real em Docker.

---

## 7. API e HTTP

- Status codes via enum `HttpStatusCode` (`@/core/enums/http-status-code`).
- Erros de negócio via `UseCaseError("key", HttpStatusCode.X)`.
- Mensagens i18n em `domain/<entity>/languages/{en,es,pt}.ts`.
- Autenticação via middleware `ensureAuthenticated`, autorização via `ensurePermission`.

---

## 8. Regra geral para agentes de IA

**Antes de gerar qualquer código ou criar arquivo neste repositório:**

1. Ler [IA_rules.md](./IA_rules.md) (este arquivo).
2. Ler [STYLE_GUIDE.md](./STYLE_GUIDE.md) e [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) quando a tarefa envolver código ou reorganização de pastas.
3. **Nunca** produzir código fora deste padrão, mesmo que a base atual contenha trechos legados que não o sigam — esses devem ser gradualmente migrados, não replicados.
4. Em PRs/commits, tratar desvio do padrão como bug.

---

**Última atualização:** 2026-04-20
