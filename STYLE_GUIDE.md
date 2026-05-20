# Guia de Estilo e Boas Práticas

> Guia abrangente para contribuir com o projeto WYMS WMS TypeScript

Este documento descreve os padrões arquiteturais, convenções de código e boas práticas utilizadas neste projeto. Leia atentamente antes de contribuir.

---

## Índice

1. [Arquitetura e Organização](#arquitetura-e-organização)
2. [Convenções de Nomenclatura](#convenções-de-nomenclatura)
3. [Camada de Domínio (Domain Layer)](#camada-de-domínio-domain-layer)
4. [Camada de Aplicação (Application Layer)](#camada-de-aplicação-application-layer)
5. [Camada de Infraestrutura (Infrastructure Layer)](#camada-de-infraestrutura-infrastructure-layer)
6. [Injeção de Dependências](#injeção-de-dependências)
7. [Testes](#testes)
8. [Qualidade de Código](#qualidade-de-código)
9. [Desenvolvimento e Workflow](#desenvolvimento-e-workflow)
10. [API e Convenções HTTP](#api-e-convenções-http)

---

## Arquitetura e Organização

### Princípios Fundamentais

Este projeto segue uma arquitetura baseada em **DDD (Domain-Driven Design)** com **Clean Architecture**, organizada em camadas bem definidas:

```
┌─────────────────────────────────────┐
│     Infrastructure Layer (infra)    │  ← Adapters externos (HTTP, DB, etc.)
├─────────────────────────────────────┤
│     Application Layer (application) │  ← Casos de uso / orquestração
├─────────────────────────────────────┤
│     Domain Layer (domain)           │  ← Regras de negócio / entidades
└─────────────────────────────────────┘
```

**Fluxo de Dependências:**
- `Infrastructure` → `Application` → `Domain`
- Dependências sempre apontam **para dentro** (Dependency Inversion)
- A camada de domínio **nunca** depende de infra ou application

### Organização por Módulos

O código é organizado em **módulos de domínio** independentes:

- **`core`** - Parâmetros de configuração e logs de auditoria
- **`host`** - Gestão de anúncios inbound
- **`iam`** - Identity and Access Management (usuários, permissões, papéis)
- **`wcs`** - Warehouse Control System (esteiras, equipamentos, rampas, sorters)
- **`wms`** - Warehouse Management System (localizações, estoque, artigos, etc.)

Cada módulo contém suas próprias camadas `application/`, `domain/` e `infra/`.

### Organização por Entidade

Dentro de cada módulo, o código é organizado por **entidade de domínio**:

```
src/modules/wms/
├── application/location/     # Casos de uso da entidade Location
├── domain/location/           # Regras de negócio da Location
└── infra/location/            # Adaptadores (HTTP, DB) da Location
```

---

## Convenções de Nomenclatura

### Arquivos e Diretórios

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| **Diretórios** | `kebab-case` | `transport-unit/`, `location-block/` |
| **Arquivos TypeScript** | `kebab-case.ts` | `create-location-use-case.ts` |
| **Testes** | `*.spec.ts` | `create-location-use-case.spec.ts` |
| **Schemas Zod** | `*.schema.ts` | `create-location.schema.ts` |
| **Mappers** | `*-mapper.ts` | `mongo-location-mapper.ts` |
| **Presenters** | `*-presenter.ts` | `location-presenter.ts` |
| **Controllers** | `*.controller.ts` | `create-location.controller.ts` |

### Classes e Interfaces

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| **Entities** | `PascalCase` | `Location`, `TransportUnit` |
| **Use Cases** | `<Verb><Entity>UseCase` | `CreateLocationUseCase` |
| **Controllers** | `<Verb><Entity>Controller` | `CreateLocationController` |
| **Repositories (interface)** | `<Entity>Repository` | `LocationRepository` |
| **Repositories (impl)** | `<DB><Entity>Repository` | `MongoLocationRepository` |
| **Mappers** | `<DB><Entity>Mapper` | `MongoLocationMapper` |
| **Presenters** | `<Entity>Presenter` | `LocationPresenter` |
| **Interfaces de Request** | `<UseCase>Request` | `CreateLocationUseCaseRequest` |
| **Types de Response** | `<UseCase>Response` | `CreateLocationUseCaseResponse` |
| **Enums** | `PascalCase` | `LocationStatus`, `LocationVisible` |

### Variáveis e Constantes

```typescript
// Variáveis: camelCase
const userId = 123;
const locationName = "A1-01-01";

// Constantes globais: UPPER_SNAKE_CASE
const DEFAULT_AUTHOR_ID = 1;
const MAX_RETRY_ATTEMPTS = 3;

// Constantes de enums: UPPER_SNAKE_CASE
export enum LocationStatus {
    ACTIVE = 1,
    INACTIVE = 2,
}
```

### Funções e Métodos

```typescript
// Use verbs para ações
async function createLocation() { }
async function findLocationById() { }
async function updateLocation() { }

// Métodos privados: prefixo underscore (opcional)
private _validateCoordinates() { }
```

---

## Camada de Domínio (Domain Layer)

A camada de domínio contém as **regras de negócio** e é totalmente independente de frameworks e infraestrutura.

### Estrutura

```
domain/<entidade>/
├── entities/              # Entidades de domínio
├── value-objects/         # Objetos de valor (quando aplicável)
├── events/                # Eventos de domínio (quando aplicável)
├── services/              # Serviços de domínio (quando aplicável)
├── repositories/          # Interfaces de repositórios
├── enums/                 # Enumerações
└── languages/             # Mensagens de erro/validação (i18n)
```

### Entidades

As entidades representam conceitos de negócio com identidade única.

**Padrão de implementação:**

```typescript
// src/modules/wms/domain/location/entities/location.ts

export interface LocationProps {
    id?: number;
    name: string;
    type: number;
    x?: number | null;
    y?: number | null;
    z?: number | null;
    sector?: string | null;
    aisle?: number | null;
    side?: number | null;
    status: number;
    visible: number;
    note?: string;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number;
    locationBlocks: LocationLocationBlockList;
}

export class Location {
    id?: number;
    name: string;
    type: number;
    // ... demais propriedades mapeadas

    // Constructor privado - força uso do factory method
    private constructor(props: LocationProps) {
        this.id = props.id;
        this.name = props.name;
        this.type = props.type;
        // ... atribuições
    }

    // Factory method estático
    static create(
        props: Optional<
            LocationProps,
            | "id"
            | "status"
            | "visible"
            | "note"
            | "x" | "y" | "z"
            | "sector" | "aisle" | "side"
            | "createdAt"
            | "updatedAt"
            | "updatedBy"
            | "locationBlocks"
        >
    ) {
        const location = new Location({
            ...props,
            status: props.status ?? LocationStatus.ACTIVE,
            visible: props.visible ?? LocationVisible.VISIBLE,
            createdAt: props.createdAt ?? new Date(),
            updatedAt: props.updatedAt ?? new Date(),
            updatedBy: props.updatedBy ?? props.createdBy,
            locationBlocks:
                props.locationBlocks ?? new LocationLocationBlockList(),
        });

        return location;
    }
}
```

**Regras:**
- Constructor sempre **privado**
- Criar instâncias via método estático `create()`
- Aplicar valores padrão no `create()`
- Usar tipo `Optional<T, K>` para campos opcionais
- Não incluir lógica de persistência na entidade
- Não referenciar frameworks externos

### Repositórios (Interfaces)

Os repositórios definem **contratos** para persistência, sem implementação.

```typescript
// src/modules/wms/domain/location/repositories/location-repository.ts

import type { DatabaseOptions } from "@/core/types/database-options";
import type { ListOptions } from "@/core/types/list-options";
import type { OrderByParam } from "@/core/types/order-by-params";
import type { SearchParams } from "@/core/types/search-params";
import type { Location } from "../entities/location";

export abstract class LocationRepository {
    abstract findById(
        id: Location["id"],
        databaseOptions?: DatabaseOptions
    ): Promise<Location | null>;

    abstract findByName(
        name: Location["name"],
        databaseOptions?: DatabaseOptions
    ): Promise<Location | null>;

    abstract findByCoordinates(
        coordinates: {
            x?: Location["x"];
            y?: Location["y"];
            z?: Location["z"];
            sector?: Location["sector"];
            aisle?: Location["aisle"];
            side?: Location["side"];
        },
        databaseOptions?: DatabaseOptions
    ): Promise<Location | null>;

    abstract findMany(
        options?: ListOptions,
        searchParams?: SearchParams<Location>[],
        databaseOptions?: DatabaseOptions
    ): Promise<{ locations: Location[]; count: number }>;

    abstract findManyForStorage(
        options?: ListOptions,
        searchParams?: SearchParams<Location>[],
        orderByParams?: OrderByParam<Location>[],
        databaseOptions?: DatabaseOptions
    ): Promise<{ locations: Location[]; count: number }>;

    abstract create(
        location: Location,
        databaseOptions?: DatabaseOptions
    ): Promise<Location>;

    abstract update(
        location: Location,
        databaseOptions?: DatabaseOptions
    ): Promise<Location>;

    abstract delete(
        location: Location,
        databaseOptions?: DatabaseOptions
    ): Promise<void>;
}
```

**Regras:**
- Usar `abstract class` (não `interface`) para repositórios
- Incluir parâmetro opcional `databaseOptions?: DatabaseOptions` para suportar transações
- Métodos assíncronos retornando `Promise`
- Usar tipagem precisa (`Location["id"]` ao invés de `number`)

### Enums

```typescript
// src/modules/wms/domain/location/enums/location-status.ts

export enum LocationStatus {
    ACTIVE = 1,
    INACTIVE = 2,
}
```

**Regras:**
- Valores numéricos para enums mapeados no banco
- Um arquivo `.ts` por enum (kebab-case)
- Nome singular para o enum

---

## Camada de Aplicação (Application Layer)

A camada de aplicação contém os **casos de uso** (use cases), orquestrando a lógica de negócio.

### Estrutura

```
application/<entidade>/
└── use-cases/
    ├── actions/       # Ações compostas (quando aplicável)
    ├── assign/        # Associações (quando aplicável)
    ├── create/
    ├── update/
    ├── delete/
    ├── find/
    │   ├── by-id/
    │   ├── by-name/
    │   └── by-coordinates/
    ├── list/
    └── patch/
```

### Use Cases

**Padrão de implementação:**

```typescript
// src/modules/wms/application/location/use-cases/create/create-location-use-case.ts

import type { DatabaseOptions } from "@/core/types/database-options";
import { Location } from "@/modules/wms/domain/location/entities/location";
import type { LocationRepository } from "@/modules/wms/domain/location/repositories/location-repository";
import { inject, injectable } from "tsyringe";

// Interface de entrada
interface CreateLocationUseCaseRequest {
    name: Location["name"];
    type: Location["type"];
    status?: Location["status"];
    createdBy: Location["createdBy"];
    databaseOptions?: DatabaseOptions;
}

// Type de saída
type CreateLocationUseCaseResponse = Location;

@injectable()
export class CreateLocationUseCase {
    constructor(
        @inject("LocationRepository")
        private locationRepository: LocationRepository
    ) {}

    async execute({
        name,
        type,
        status,
        createdBy,
        databaseOptions,
    }: CreateLocationUseCaseRequest): Promise<CreateLocationUseCaseResponse> {
        // Validações e lógica de negócio

        const newLocation = Location.create({
            name,
            type,
            status,
            createdBy,
            updatedBy: createdBy,
        });

        const location = await this.locationRepository.create(
            newLocation,
            databaseOptions
        );

        return location;
    }
}
```

**Regras:**
- Decorar com `@injectable()` para injeção de dependências
- Definir `interface <UseCase>Request` com parâmetros de entrada
- Definir `type <UseCase>Response` com retorno
- Injetar dependências via constructor usando `@inject()`
- Incluir `databaseOptions?: DatabaseOptions` para suportar transações
- Método público `async execute()` contendo a lógica
- Não acessar detalhes de HTTP (request, response) diretamente
- Não incluir lógica de apresentação (formatting para JSON)

---

## Camada de Infraestrutura (Infrastructure Layer)

A camada de infraestrutura contém **adaptadores** que conectam o domínio ao mundo externo (HTTP, banco de dados, filas, etc.).

### Estrutura HTTP

```
infra/<entidade>/
├── controllers/
│   └── create/
│       ├── create-<entidade>.controller.ts
│       └── create-<entidade>.schema.ts
├── http/
│   └── routes/
│       └── <entidade>.routes.ts
└── presenter/
    └── <entidade>-presenter.ts
```

### Controllers

**Padrão de implementação:**

```typescript
// src/modules/wms/infra/location/controllers/create/create-location.controller.ts

import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { CreateLocationUseCase } from "@/modules/wms/application/location/use-cases/create/create-location-use-case";
import { LocationVisible } from "@/modules/wms/domain/location/enums/location-visible";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { createLocationBodySchema } from "./create-location.schema";

export class CreateLocationController {
    async handle(request: FastifyRequest, reply: FastifyReply) {
        const { user } = request.session;

        // Validação com Zod
        const { name, type, x, y, z, sector, aisle, side, status, note } =
            zodValidationSchema(createLocationBodySchema, request.body);

        // Resolver use case do container DI
        const createLocationUseCase = container.resolve(CreateLocationUseCase);

        // Executar use case
        const location = await createLocationUseCase.execute({
            name,
            type,
            x,
            y,
            z,
            sector,
            aisle,
            side,
            status,
            visible: LocationVisible.VISIBLE,
            note,
            createdBy: user,
        });

        // Retornar resposta
        return reply.status(HttpStatusCode.CREATED).send({ location });
    }
}
```

**Regras:**
- Um controller por ação (create, update, delete, etc.)
- Método `async handle(request, reply)`
- Validar entrada com `zodValidationSchema(schema, data)`
- Resolver use case com `container.resolve()`
- Retornar status HTTP apropriado
- Não incluir lógica de negócio no controller
- Não injetar dependências via constructor (usar `container.resolve()`)

### Schemas Zod

```typescript
// src/modules/wms/infra/location/controllers/create/create-location.schema.ts

import { z } from "zod";

export const createLocationBodySchema = z.object({
    name: z.string().min(1).max(50),
    type: z.number().int().positive(),
    status: z.number().int().optional(),
    note: z.string().max(500).optional(),
});
```

**Regras:**
- Um schema por endpoint/ação
- Validar tipos e constraints
- Usar `.optional()` para campos opcionais
- Incluir validações de tamanho (`.min()`, `.max()`)

### Rotas

```typescript
// src/modules/wms/infra/location/http/routes/location.routes.ts

import type { FastifyInstance } from "fastify";
import { CreateLocationController } from "../../controllers/create/create-location.controller";

export async function locationRoutes(app: FastifyInstance) {
    const createLocationController = new CreateLocationController();

    app.post("/locations", {
        onRequest: [app.ensureAuthenticated],
        handler: createLocationController.handle,
    });
}
```

**Regras:**
- Função assíncrona exportada
- Recebe `FastifyInstance` como parâmetro
- Instanciar controllers localmente
- Usar middlewares (`onRequest`) para autenticação/autorização
- Registrar rotas no `src/infra/http/routes/index.ts`

### Repositórios (Implementação)

```typescript
// src/modules/wms/infra/location/database/repositories/mongo-location-repository.ts

import type { DatabaseOptions } from "@/core/types/database-options";
import { Location } from "@/modules/wms/domain/location/entities/location";
import { LocationRepository } from "@/modules/wms/domain/location/repositories/location-repository";
import { injectable } from "tsyringe";

@injectable()
export class MongoLocationRepository extends LocationRepository {
    async findById(
        id: number,
        databaseOptions?: DatabaseOptions
    ): Promise<Location | null> {
        // Implementação MongoDB (Mongoose)
    }

    async create(
        location: Location,
        databaseOptions?: DatabaseOptions
    ): Promise<Location> {
        // Implementação MongoDB (Mongoose)
    }

    // ... outros métodos
}
```

**Regras:**
- Extender a classe abstrata do repositório de domínio
- Decorar com `@injectable()`
- Prefixar com nome do banco (`Mongo`, etc.)
- Usar mappers para converter entre domínio e persistência
- Suportar `databaseOptions` para transações

### Mappers

```typescript
// src/modules/wms/infra/location/database/mappers/mongo-location-mapper.ts

import { Location } from "@/modules/wms/domain/location/entities/location";

export interface MongoLocationDocument {
    id: Location["id"];
    name: Location["name"];
    type: Location["type"];
    // ... demais campos tipados
    created_at: Location["createdAt"];
    created_by: Location["createdBy"];
    updated_at: Location["updatedAt"];
    updated_by: Location["updatedBy"];
}

export class MongoLocationMapper {
    static toDomain(raw: MongoLocationDocument): Location {
        return Location.create({
            id: raw.id,
            name: raw.name,
            type: raw.type,
            createdAt: raw.created_at,
            createdBy: raw.created_by,
            updatedAt: raw.updated_at,
            updatedBy: raw.updated_by,
        });
    }

    static toPersistency(location: Location): MongoLocationDocument {
        return {
            id: location.id,
            name: location.name,
            type: location.type,
            created_at: location.createdAt,
            created_by: location.createdBy,
            updated_at: location.updatedAt,
            updated_by: location.updatedBy,
        };
    }
}
```

**Regras:**
- Definir `interface` tipada para o formato do banco (e.g. `MongoLocationDocument`)
- Métodos estáticos `toDomain()` e `toPersistency()`
- Converter formato do ODM (`_id`, documentos raw do Mongoose) ↔ camelCase (domain)
- Usar factory method da entidade (`Entity.create()`)

---

## Injeção de Dependências

Este projeto usa **tsyringe** para injeção de dependências.

### Registro de Dependências

O registro é feito através de **arquivos provider** em cada módulo, importados centralmente no `src/infra/providers/index.ts`:

```typescript
// src/infra/providers/index.ts
import "@/modules/iam/infra/providers";
import "@/modules/wms/infra/providers";
import "@/modules/host/infra/providers/host.provider";
import "@/modules/wcs/infra/providers";
import "@/modules/core/infra/providers";
import "@/infra/database/providers/database.provider";
import "@/infra/providers/cache/cache.provider";
```

Cada módulo define seus próprios providers que registram as implementações concretas:

```typescript
// Exemplo dentro de um provider de módulo
import { container } from "tsyringe";
import { LocationRepository } from "@/modules/wms/domain/location/repositories/location-repository";
import { MongoLocationRepository } from "@/modules/wms/infra/location/database/repositories/mongo-location-repository";

container.registerSingleton<LocationRepository>(
    "LocationRepository",
    MongoLocationRepository
);
```

### Injeção em Use Cases

```typescript
@injectable()
export class CreateLocationUseCase {
    constructor(
        @inject("LocationRepository")
        private locationRepository: LocationRepository,
        @inject(OtherUseCase)
        private otherUseCase: OtherUseCase
    ) {}
}
```

**Regras:**
- Usar `@inject("RepositoryName")` para repositórios (string token)
- Usar `@inject(ClassName)` para use cases e serviços
- Sempre injetar **interfaces/abstrações**, não implementações concretas
- Registrar singletons para repositórios e providers

### Resolução em Controllers

```typescript
const useCase = container.resolve(CreateLocationUseCase);
```

---

## Testes

### Estrutura de Testes

Os testes seguem a mesma estrutura de `src/`:

```
test/
├── test-setup.ts              # Configuração global de testes
├── core/                      # Testes de utilitários core
├── infra/                     # Testes de infraestrutura
├── modules/
│   ├── core/
│   ├── host/
│   ├── iam/
│   ├── wcs/
│   └── wms/
│       └── application/
│           └── location/
│               └── use-cases/
│                   └── create/
│                       └── create-location-use-case.spec.ts
└── utils/
    ├── create-stock-e2e.ts    # Factory para criação de estoque em E2E
    ├── iam-login-e2e.ts       # Helper de login para testes E2E
    ├── reset-db.ts            # Reset do banco de dados para testes
    └── setup-e2e.ts           # Setup geral para testes E2E
```

### Testes Unitários (Use Cases)

```typescript
// test/modules/wms/application/location/use-cases/create/create-location-use-case.spec.ts

import { CreateLocationUseCase } from "@/modules/wms/application/location/use-cases/create/create-location-use-case";
import { InMemoryLocationRepository } from "@test/modules/wms/infra/location/repositories/in-memory-location-repository";
import { beforeEach, describe, expect, it } from "vitest";

let inMemoryLocationRepository: InMemoryLocationRepository;
let sut: CreateLocationUseCase; // System Under Test

describe("Create location use case", () => {
    beforeEach(() => {
        inMemoryLocationRepository = new InMemoryLocationRepository();
        sut = new CreateLocationUseCase(inMemoryLocationRepository);
    });

    it("should be able to create a new location", async () => {
        const result = await sut.execute({
            name: "A1-01-01",
            type: 1,
            createdBy: 1,
        });

        expect(result).toMatchObject({
            id: expect.any(Number),
            name: "A1-01-01",
            type: 1,
        });

        expect(inMemoryLocationRepository.items).toHaveLength(1);
    });
});
```

**Regras:**
- Usar repositórios **in-memory** para testes unitários
- Nomear SUT (System Under Test) como `sut`
- Usar `beforeEach()` para setup
- Descrição clara: `"should be able to..."`
- Validar estado final dos repositórios in-memory
- Usar `expect.any(Type)` para valores não-determinísticos

### Test Factories (Fixtures)

```typescript
// test/modules/wms/domain/location/entities/make-location.ts

import { Location } from "@/modules/wms/domain/location/entities/location";

export function makeLocation(override?: Partial<LocationProps>) {
    return Location.create({
        name: "TEST-LOC",
        type: 1,
        createdBy: 1,
        ...override,
    });
}
```

**Regras:**
- Prefixo `make<Entity>()`
- Parâmetro `override` para customização
- Valores padrão válidos
- Localizar em `test/modules/<module>/domain/<entity>/entities/`

### Testes E2E

```typescript
// test/modules/wms/infra/location/controllers/create-location.controller.e2e-spec.ts

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

describe("Create location (E2E)", () => {
    beforeAll(async () => {
        // Setup database, authenticate, etc.
    });

    it("should create a location", async () => {
        const response = await request(app.server)
            .post("/locations")
            .set("Cookie", sessionCookie)
            .send({
                name: "E2E-LOC",
                type: 1,
            });

        expect(response.status).toBe(201);
        expect(response.body.location).toMatchObject({
            name: "E2E-LOC",
        });
    });

    afterAll(async () => {
        // Cleanup
    });
});
```

**Comandos:**
```bash
bun test              # Testes unitários (watch)
bun test:run          # Testes unitários (run once com coverage)
bun test:e2e          # Testes E2E
bun test:ci           # Ambos (para CI)
```

---

## Qualidade de Código

### ESLint

Configurado em `eslint.config.ts`:

```typescript
rules: {
    "prettier/prettier": ["error", {
        singleQuote: false,
        endOfLine: "lf",
        trailingComma: "es5",
        tabWidth: 4,
        printWidth: 80,
    }],
}
```

**Comando:**
```bash
bun lint:check        # Verifica linting + formatação + TypeScript
```

### Prettier

Configurado em `prettier.config.js`:

- **Quotes:** Aspas duplas (`"`)
- **Tab width:** 4 espaços
- **Print width:** 80 caracteres
- **Trailing comma:** ES5
- **Semicolons:** Sim

**Import Order (via `@ianvs/prettier-plugin-sort-imports`):**
```typescript
// 1. Core imports
import { ... } from "@core/...";

// 2. Infra imports
import { ... } from "@infra/...";

// 3. Module imports
import { ... } from "@modules/...";

// 4. Relative imports
import { ... } from "./...";
```

### TypeScript

Configuração em `tsconfig.json`:

- **Strict mode:** Habilitado
- **No unchecked indexed access:** Habilitado
- **Decorators:** Habilitados (para tsyringe)
- **Paths:**
  - `@/*` → `./src/*`
  - `@test/*` → `./test/*`

---

## Desenvolvimento e Workflow

### Scripts Principais

```bash
# Desenvolvimento
bun dev                    # Inicia ambiente completo (DB + servidor)
bun dev:reset              # Reseta banco e reinicia ambiente

# Testes
bun test                   # Testes unitários (watch mode)
bun test:run               # Testes unitários (run once + coverage)
bun test:e2e               # Testes E2E
bun test:ci                # Todos os testes (para CI)

# Build e Lint
bun build                  # Build de produção
bun lint:check             # Verifica linting, formatação e tipos

# Database (MongoDB)
# Evolução de schema é feita via Mongoose models (sem migrations SQL).
# Para seeds/transformações de dados use scripts em scripts/ rodados com `bun run <script>`.

# Docker
bun services:up            # Sobe containers (DB, Redis, RabbitMQ)
bun services:down          # Derruba containers
bun docker:reset           # Reseta Docker completamente
```

### Workflow de Desenvolvimento

1. **Criar feature branch** (se aplicável)
2. **Iniciar ambiente:**
   ```bash
   bun dev
   ```
3. **Desenvolver seguindo arquitetura:**
   - Domain → Application → Infrastructure → Testes
4. **Rodar testes:**
   ```bash
   bun test
   bun test:e2e
   ```
5. **Verificar qualidade:**
   ```bash
   bun lint:check
   ```
6. **Atualizar schema Mongoose** (se alterou formato de dado):
   - Ajuste o `Schema` em `infra/<entidade>/database/schemas/`
   - Se a mudança afeta dados existentes, escreva script one-off em `scripts/` para migrar os documentos
7. **Commit e push**

### Ambiente Docker

O projeto usa Docker Compose para:
- **MongoDB** - Banco de dados principal (via Mongoose)
- **Redis** - Cache e sessões
- **RabbitMQ** - Fila de mensagens

Arquivos:
- `src/infra/docker/compose.yml` - Desenvolvimento
- `src/infra/docker/compose.test.yml` - Testes E2E

---

## API e Convenções HTTP

### Status Codes

Use a enum `HttpStatusCode` de `@/core/enums/http-status-code`:

```typescript
import HttpStatusCode from "@/core/enums/http-status-code";

// Criação bem-sucedida
reply.status(HttpStatusCode.CREATED).send({ location });

// Sucesso
reply.status(HttpStatusCode.OK).send({ data });

// Não encontrado
reply.status(HttpStatusCode.NOT_FOUND).send({ message });

// Conflito (duplicação)
reply.status(HttpStatusCode.CONFLICT).send({ error });

// Validação
reply.status(HttpStatusCode.BAD_REQUEST).send({ errors });

// Não autorizado
reply.status(HttpStatusCode.UNAUTHORIZED).send({ message });
```

### Tratamento de Erros

Use `UseCaseError` para erros de negócio:

```typescript
import { UseCaseError } from "@/core/errors/use-case-error";
import HttpStatusCode from "@/core/enums/http-status-code";

throw new UseCaseError("location.not-found", HttpStatusCode.NOT_FOUND);
```

Mensagens de erro são internacionalizadas via `i18next` em:
- `src/modules/<module>/domain/<entity>/languages/<lang>.ts`

### Autenticação e Autorização

**Middlewares:**
- `ensureAuthenticated` - Verifica se usuário está autenticado
- `ensurePermission(permission)` - Verifica permissão específica

**Uso:**
```typescript
app.post("/locations", {
    onRequest: [app.ensureAuthenticated],
    handler: controller.handle,
});
```

### OpenAPI/Swagger

Documentação automática disponível em `/docs`.

Configuração em `src/infra/http/openapi/openapi-config.ts`.

---

## Boas Práticas Gerais

### Fazer

- Seguir a estrutura de camadas rigorosamente
- Usar injeção de dependências
- Escrever testes para use cases
- Validar entrada com Zod
- Usar tipos do TypeScript estritamente
- Documentar código complexo
- Manter schemas Mongoose alinhados com as entidades de domínio
- Reutilizar código via `src/core/`

### Evitar

- Lógica de negócio em controllers
- Acessar banco direto de use cases (usar repositórios)
- Misturar responsabilidades de camadas
- Commits sem testes
- Código duplicado
- Variáveis `any`
- Comentários desnecessários ("código auto-explicativo")

---

## Contribuindo

1. **Leia este guia completamente**
2. **Consulte `FOLDER_STRUCTURE.md`** para entender organização
3. **Estude exemplos existentes** (ex: `location`, `transport-unit`)
4. **Siga os padrões estabelecidos**
5. **Escreva testes**
6. **Documente decisões não-óbvias**

**Dúvidas?** Consulte o código existente ou peça ajuda ao time!

---

**Última atualização:** 2026-02-17
