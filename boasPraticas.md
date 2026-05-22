# Guia de Estilo e Boas Práticas

## Objetivo

Este documento define os padrões de arquitetura, desenvolvimento e organização utilizados no projeto WYMS WMS TypeScript.  
Seu objetivo é garantir consistência, legibilidade, escalabilidade e facilidade de manutenção do código.

---

# Arquitetura do Projeto

O projeto segue os princípios de:

- Domain-Driven Design (DDD)
- Clean Architecture
- Dependency Injection
- SOLID

A aplicação é organizada em três camadas principais:

```text
Infrastructure → Application → Domain
```

## Regras Arquiteturais

- Dependências sempre apontam para dentro
- A camada de domínio não depende de infraestrutura
- Casos de uso devem conter apenas regras de negócio
- Controllers não devem conter lógica de negócio
- Infraestrutura deve apenas adaptar entradas e saídas

---

# Convenções de Nomenclatura

## Diretórios

Utilizar `kebab-case`:

```text
transport-unit/
location-block/
```

## Arquivos

```text
create-location-use-case.ts
location-repository.ts
sqlserver-location-mapper.ts
```

## Classes

Utilizar `PascalCase`:

```ts
CreateLocationUseCase
LocationRepository
SqlServerLocationMapper
```

## Variáveis

Utilizar `camelCase`:

```ts
const userId = 1;
const locationName = "A1-01-01";
```

## Constantes

Utilizar `UPPER_SNAKE_CASE`:

```ts
const MAX_RETRY_ATTEMPTS = 3;
```

---

# Camada de Domínio

A camada de domínio representa as regras centrais do negócio.

## Regras

- Entidades devem possuir constructor privado
- Instâncias devem ser criadas via método estático `create()`
- Não incluir lógica de persistência
- Não depender de frameworks externos
- Utilizar enums para estados do domínio

## Exemplo

```ts
export class Location {
    private constructor(props: LocationProps) {}

    static create(props: LocationProps) {
        return new Location(props);
    }
}
```

---

# Repositórios

Os repositórios representam contratos de persistência.

## Regras

- Utilizar `abstract class`
- Métodos sempre assíncronos
- Não implementar lógica de negócio
- Implementações devem ficar na camada `infra`

## Exemplo

```ts
export abstract class LocationRepository {
    abstract findById(id: number): Promise<Location | null>;
}
```

---

# Use Cases

Os casos de uso devem conter apenas orquestração e regras de negócio.

## Regras

- Decorar com `@injectable()`
- Utilizar injeção de dependência
- Implementar método `execute()`
- Não acessar HTTP diretamente
- Não formatar respostas HTTP

## Exemplo

```ts
@injectable()
export class CreateLocationUseCase {
    async execute(data: CreateLocationRequest) {}
}
```

---

# Controllers

Controllers devem apenas:

- Receber requisições
- Validar dados
- Chamar use cases
- Retornar respostas HTTP

## Não permitido

- Regra de negócio
- Acesso direto ao banco
- Manipulação complexa de dados

---

# Validação

Utilizar Zod para validação de entrada.

## Exemplo

```ts
export const createLocationBodySchema = z.object({
    name: z.string().min(1),
});
```

---

# Injeção de Dependências

O projeto utiliza `tsyringe`.

## Regras

- Repositórios devem ser registrados como singleton
- Dependências devem ser abstrações
- Nunca depender de implementações concretas

---

# Testes

## Regras

- Todo use case deve possuir teste
- Utilizar repositórios in-memory
- Nomear System Under Test como `sut`
- Utilizar `beforeEach` para setup

## Estrutura

```text
test/modules/wms/application/location/use-cases/
```

---

# Qualidade de Código

## ESLint e Prettier

O projeto utiliza:

- ESLint
- Prettier
- TypeScript Strict Mode

## Padrões

- Aspas duplas
- 4 espaços
- Máximo de 80 caracteres
- Sem código duplicado

---

# Convenções HTTP

## Status Codes

Utilizar enum centralizada:

```ts
HttpStatusCode.CREATED
HttpStatusCode.OK
HttpStatusCode.NOT_FOUND
```

---

# Segurança

## Não permitido

- Expor tokens
- Versionar `.env`
- Armazenar credenciais no código
- Retornar erros sensíveis

---

# Boas Práticas Gerais

## Fazer

- Seguir a arquitetura por camadas
- Criar testes
- Utilizar tipagem forte
- Reutilizar código
- Documentar fluxos complexos

## Evitar

- Lógica de negócio em controllers
- Código duplicado
- Uso de `any`
- Acesso direto ao banco fora dos repositórios

---

# Workflow de Desenvolvimento

## Fluxo recomendado

```text
Domain → Application → Infrastructure → Tests
```

## Comandos principais

```bash
bun dev
bun test
bun test:e2e
bun lint:check
```

---

# Objetivo Final

O projeto deve priorizar:

- Escalabilidade
- Baixo acoplamento
- Alta coesão
- Legibilidade
- Facilidade de manutenção
- Padronização entre equipes
