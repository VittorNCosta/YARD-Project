# Estrutura de Pastas do Projeto

## Objetivo

Este documento apresenta a organização estrutural do projeto WYMS WMS TypeScript, seguindo os princípios de DDD (Domain-Driven Design) e Clean Architecture.

---

# Estrutura Geral

```text
src/
├── config/
├── core/
├── infra/
└── modules/
```

---

# Config

Responsável pelas configurações globais da aplicação.

## Estrutura

```text
src/config/
└── env.ts
```

---

# Core

Contém recursos compartilhados entre todos os módulos.

## Estrutura

```text
src/core/
├── entities/
├── enums/
├── errors/
├── types/
└── utils/
```

## Responsabilidades

- Tipos globais
- Utilitários
- Enums
- Erros padronizados
- Helpers reutilizáveis

---

# Infra

Camada responsável pela infraestrutura da aplicação.

## Estrutura

```text
src/infra/
├── database/
├── docker/
├── http/
├── languages/
├── providers/
├── rabbitmq/
├── schemas/
├── setup/
└── utils/
```

## Responsabilidades

- Banco de dados
- Fastify
- Redis
- RabbitMQ
- Docker
- OpenAPI
- Providers
- Middlewares

---

# Modules

Contém os módulos de domínio da aplicação.

## Estrutura

```text
src/modules/
├── core/
├── host/
├── iam/
├── wcs/
└── wms/
```

---

# Estrutura Interna dos Módulos

Cada módulo segue a arquitetura:

```text
application/
domain/
infra/
```

---

# Application Layer

Responsável pelos casos de uso.

## Estrutura

```text
application/<entity>/use-cases/
```

## Organização

```text
create/
update/
delete/
find/
list/
patch/
assign/
actions/
```

## Responsabilidades

- Orquestração
- Regras de aplicação
- Fluxos de negócio

---

# Domain Layer

Responsável pelas regras centrais do negócio.

## Estrutura

```text
domain/<entity>/
├── entities/
├── repositories/
├── enums/
├── services/
├── events/
├── value-objects/
└── languages/
```

## Responsabilidades

- Entidades
- Regras de negócio
- Contratos
- Enums
- Objetos de valor

---

# Infrastructure Layer

Responsável pelos adaptadores externos.

## Estrutura

```text
infra/<entity>/
├── controllers/
├── database/
├── http/
├── presenter/
├── providers/
└── schemas/
```

---

# Controllers

## Estrutura

```text
controllers/create/
controllers/update/
controllers/delete/
```

## Responsabilidades

- Receber requests
- Validar dados
- Executar use cases
- Retornar responses

---

# Database

## Estrutura

```text
database/
├── repositories/
└── mappers/
```

## Responsabilidades

- Persistência
- Mapeamento
- Integração SQL Server

---

# HTTP

## Estrutura

```text
http/routes/
```

## Responsabilidades

- Registro de rotas
- Middleware
- Organização HTTP

---

# Presenter

Responsável pela formatação das respostas da API.

---

# Estrutura de Testes

A estrutura de testes replica a estrutura de `src/`.

## Estrutura

```text
test/
├── core/
├── infra/
├── modules/
└── utils/
```

---

# Organização dos Testes

## Unitários

```text
test/modules/wms/application/location/use-cases/
```

## E2E

- Controllers
- Fluxos completos
- Integrações

---

# Scripts do Projeto

## Estrutura

```text
scripts/
├── dev.sh
├── migration-create.ts
├── migration-run.ts
└── test-ci.sh
```

---

# Configurações de Ambiente

## Arquivos

```text
.env
.env.example
.env.test
```

---

# Configurações de Qualidade

## Arquivos

```text
eslint.config.ts
prettier.config.js
tsconfig.json
```

---

# Configurações Docker

## Estrutura

```text
src/infra/docker/
├── compose.yml
└── compose.test.yml
```

---

# Organização Recomendada

## Fluxo Arquitetural

```text
HTTP → Controller → UseCase → Repository → Database
```

---

# Regras Gerais

## Obrigatório

- Separação por camadas
- Baixo acoplamento
- Alta coesão
- Injeção de dependências
- Tipagem forte

## Não permitido

- Regras de negócio em controllers
- Acesso direto ao banco fora dos repositórios
- Código duplicado
- Dependências cruzadas entre camadas

---

# Objetivo Final

A estrutura do projeto deve garantir:

- Escalabilidade
- Organização
- Facilidade de manutenção
- Reutilização
- Clareza arquitetural
- Padronização entre equipes
