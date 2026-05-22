Estrutura de Pastas do Projeto
Arquitetura baseada em módulos (DDD + Clean Architecture) refletindo a estrutura real do repositório.
Visão geral (raiz do projeto)
Principais diretórios/arquivos na raiz:
.
├── .editorconfig           # Configuração do editor
├── .env                    # Variáveis de ambiente (desenvolvimento)
├── .env.example            # Template de variáveis de ambiente
├── .env.test               # Variáveis de ambiente (testes)
├── .github/                # Configurações do GitHub (workflows, labels)
├── .gitignore              # Arquivos ignorados pelo Git
├── FOLDER_STRUCTURE.md     # Este documento
├── STYLE_GUIDE.md          # Guia de estilo e boas práticas
├── README.md               # Visão geral do projeto
├── package.json            # Scripts, dependências e comandos Bun
├── bun.lock                # Lockfile do Bun
├── eslint.config.ts        # Configuração do ESLint
├── prettier.config.js      # Configuração do Prettier
├── tsconfig.json           # Configuração do TypeScript
├── vite.config.ts          # Configuração do Vite (testes unitários)
├── vitest.e2e.config.ts    # Configuração do Vitest (testes E2E)
├── dist/                   # Build de produção
├── node_modules/           # Dependências instaladas
├── scripts/                # Scripts de automação (dev, migrações, CI etc.)
├── src/                    # Código-fonte da aplicação
├── test/                   # Testes unitários e e2e
└── temp/                   # Artefatos auxiliares (logs, árvore de pastas, etc.)
​
.github/ - Configurações CI/CD
Contém workflows do GitHub Actions e configurações de automação:
.github
├── labeler.yml             # Configuração de auto-labels para PRs
└── workflows/
    ├── auto-label.yml      # Workflow para adicionar labels automaticamente
    ├── coverage.yml        # Workflow para relatórios de cobertura de código
    ├── e2e-tests.yaml      # Workflow para testes E2E
    ├── lint.yml            # Workflow para linting
    └── tests.yaml          # Workflow para testes unitários
​
scripts/ - Scripts de Automação
Scripts auxiliares para desenvolvimento e CI/CD:
scripts
├── dev.sh                  # Script principal para ambiente de desenvolvimento
├── dev-reset.sh            # Reseta ambiente de desenvolvimento
├── docker-reset.sh         # Reseta containers Docker
├── migration-create.ts     # Cria novas migrações de banco de dados
├── migration-run.ts        # Executa migrações pendentes
├── test-ci.sh              # Script para rodar testes em CI
└── wait-for-database.ts    # Aguarda banco de dados estar pronto
​
Principais comandos (via package.json):
bun dev - Inicia ambiente de desenvolvimento
bun test - Roda testes unitários em watch mode
bun test:e2e - Roda testes E2E
bun migration:create -n <nome> - Cria nova migração
bun migration:run - Executa migrações
Estrutura principal de src/
src
├── config/                 # Configurações globais (ex.: env.ts)
├── core/                   # Núcleo compartilhado entre módulos
├── infra/                  # Infraestrutura compartilhada (HTTP, DB, logs, etc.)
└── modules/                # Módulos de domínio (core, host, iam, wcs, wms)
​
src/config
Configurações globais da aplicação:
src/config
└── env.ts                  # Validação e tipagem de variáveis de ambiente
​
src/core
Responsável por tipos, utilitários e contratos genéricos reutilizáveis em todos os módulos.
src/core
├── entities/               # Entidades/utilitários genéricos
│   └── watched-list.ts     # Implementação de listas observáveis
├── enums/                  # Enumerações gerais
│   ├── http-status-code.ts # Códigos HTTP padronizados
│   └── time-in-seconds.ts  # Constantes de tempo em segundos
├── errors/                 # Erros de uso comum
│   ├── schema-validation-error.ts  # Erro de validação de schema
│   └── use-case-error.ts           # Classe base para erros de use case
├── types/                  # Tipos utilitários
│   ├── database-options.ts # Opções de transação/conexão de banco
│   ├── delete-options.ts   # Opções para operações de delete
│   ├── find-options.ts     # Opções para operações de busca
│   ├── list-options.ts     # Opções para operações de listagem
│   ├── optional.ts         # Tipo utilitário Optional<T, K>
│   ├── order-by-params.ts  # Parâmetros de ordenação
│   └── search-params.ts    # Parâmetros de busca/filtro
└── utils/
    ├── chunk-array/        # Divide arrays em chunks
    ├── pagination/         # Cálculo de paginação
    ├── remove-undefined-props/  # Remove propriedades undefined
    └── string/             # Helpers de string (ex.: to-snake-case)
​
src/infra
Infraestrutura compartilhada por todos os módulos.
src/infra
├── @types/                 # Tipagens globais
│   └── fastify.t.ts        # Extensões de tipos do Fastify
├── config/                 # Configuração de infraestrutura
│   └── database.ts         # Configuração de conexão com banco de dados
├── database/               # Clientes e gestão de bancos de dados
│   ├── database-client.ts  # Interface/abstração do cliente de banco
│   ├── transaction.ts      # Gestão de transações
│   ├── factories/          # Factories para criação de clientes
│   │   ├── database-client-factory.ts
│   │   └── migration-manager-factory.ts
│   ├── migrations/         # Sistema de migrações
│   │   ├── migration-manager.ts
│   │   └── sqlserver-migration-manager.ts
│   ├── providers/          # Providers de banco de dados
│   │   └── database.provider.ts
│   ├── redis/              # Cliente Redis
│   │   ├── redis-connection.ts
│   │   └── redis-session-store.ts
│   └── sqlserver/          # Cliente SQL Server
│       ├── sqlserver-client.ts
│       ├── migrations/     # Migrações SQL Server
│       ├── seed/           # Seeds para desenvolvimento
│       └── utils/          # Utilitários SQL Server
├── docker/                 # Configurações Docker
│   ├── compose.yml         # Docker Compose para desenvolvimento
│   └── compose.test.yml    # Docker Compose para testes
├── http/                   # Aplicação HTTP (Fastify)
│   ├── app.ts              # Configuração principal do app Fastify
│   ├── middlewares/
│   │   ├── ensure-authenticated.ts  # Middleware de autenticação
│   │   ├── ensure-permission.ts     # Middleware de autorização
│   │   └── error-handler.ts         # Handler global de erros
│   ├── openapi/
│   │   └── openapi-config.ts        # Configuração OpenAPI/Swagger
│   ├── routes/
│   │   └── index.ts        # Registro de todas as rotas
│   └── utils/
│       ├── zod/            # Utilitários para validação com Zod
│       └── ...
├── languages/              # i18n global
│   ├── en.ts               # Traduções em inglês
│   ├── es.ts               # Traduções em espanhol
│   ├── pt.ts               # Traduções em português
│   ├── i18n.ts             # Configuração do i18next
│   └── index.ts            # Barrel export
├── providers/              # Providers genéricos
│   ├── index.ts            # Registro de todos os providers
│   ├── cache/              # Provider de cache (Redis)
│   ├── log/                # Logger (Winston)
│   └── queue-provider/     # Provider de fila de mensagens (RabbitMQ)
├── rabbitmq/               # Configuração RabbitMQ
│   ├── setup-rabbit-mq-connection-manager.ts
│   ├── setup-rabbit-mq-queue-manager.ts
│   ├── start-rabbit-mq-consumes.ts
│   └── start-rabbit-mq-queues.ts
├── schemas/                # Schemas comuns (OpenAPI + Zod)
│   ├── openapi/            # Schemas OpenAPI compartilhados
│   │   ├── common-list-query.schema.ts
│   │   └── common-responses.schema.ts
│   └── zod/                # Schemas Zod compartilhados
├── server.ts               # Entry point do servidor HTTP
├── setup/                  # Bootstrapping da aplicação
│   ├── index.ts            # Orquestra todo o setup
│   ├── setup-database.ts   # Inicialização do banco de dados
│   ├── setup-openapi.ts    # Configuração OpenAPI
│   ├── setup-rabbitmq.ts   # Inicialização do RabbitMQ
│   ├── setup-redis.ts      # Inicialização do Redis
│   ├── setup-routes.ts     # Registro de rotas
│   └── setup-security.ts   # Configurações de segurança (CORS, cookies, sessão)
└── utils/                  # Utilitários de infra
    ├── delay.ts            # Função de delay assíncrono
    └── promise-with-timeout.ts  # Promise com timeout
​
Estrutura por módulo em src/modules/
Os módulos seguem o padrão DDD, separados em application, domain e infra.
src/modules
├── core/                   # Módulo core (audit-log, parameter)
├── host/                   # Gestão de anúncios inbound (inbound-announcement)
├── iam/                    # Identity and Access Management (permission, role, user)
├── wcs/                    # Warehouse Control System (conveyor, equipment, invoice-ramp, ramp, sorter)
└── wms/                    # Warehouse Management System (16 entidades)
​
Módulos e suas Entidades
Módulo core:
audit-log - Logs de auditoria do sistema
parameter - Parâmetros de configuração do sistema
Módulo host:
inbound-announcement - Anúncios de recebimento inbound
Módulo iam (Identity and Access Management):
permission - Permissões do sistema
role - Papéis/funções de usuários
user - Usuários do sistema
Módulo wcs (Warehouse Control System):
conveyor - Esteiras transportadoras
equipment - Equipamentos
invoice-ramp - Rampas de notas fiscais
ramp - Rampas
sorter - Classificadores/sorters
Módulo wms (Warehouse Management System):
article - Artigos/produtos
article-unit - Unidades de medida de artigos
event - Eventos do sistema WMS
invoice - Notas fiscais
invoice-line - Linhas de nota fiscal
load - Cargas
location - Localizações no armazém
location-block - Bloqueios de localização
reject - Rejeições
reject-reason-type - Tipos de razão de rejeição
reject-reasons - Razões de rejeição
stock-item - Itens de estoque
stock-item-situation - Situação de itens de estoque
transport-order - Ordens de transporte
transport-unit - Unidades de transporte
wave - Ondas de separação
Estrutura Padrão de um Módulo
Cada módulo segue o padrão abaixo (exemplo usando wms):
src/modules/wms
├── application/
│   └── <entidade>/
│       └── use-cases/      # Casos de uso (create, update, list, find, patch, delete...)
│           ├── actions/    # Ações compostas (quando aplicável)
│           ├── create/
│           │   └── create-<entidade>-use-case.ts
│           ├── update/
│           ├── delete/
│           ├── find/
│           │   ├── by-id/
│           │   ├── by-name/
│           │   └── ...
│           ├── list/
│           ├── assign/     # Associações (quando aplicável)
│           └── patch/
├── domain/
│   └── <entidade>/
│       ├── entities/       # Entidades de domínio
│       │   └── <entidade>.ts
│       ├── value-objects/  # Objetos de valor (quando aplicável)
│       ├── events/         # Eventos de domínio (quando aplicável)
│       ├── services/       # Serviços de domínio (quando aplicável)
│       ├── repositories/   # Interfaces de repositórios
│       │   └── <entidade>-repository.ts
│       ├── enums/          # Enumerações da entidade
│       └── languages/      # Mensagens/i18n da entidade
│           ├── en.ts
│           ├── es.ts
│           └── pt.ts
└── infra/
    ├── http/               # Rotas agregadas do módulo (quando aplicável)
    │   └── routes.ts
    ├── languages/          # i18n do módulo (quando aplicável)
    ├── providers/          # Providers do módulo (quando aplicável)
    └── <entidade>/
        ├── controllers/    # Controllers HTTP por caso de uso
        │   ├── create/
        │   │   ├── create-<entidade>.controller.ts
        │   │   └── create-<entidade>.schema.ts
        │   ├── update/
        │   ├── delete/
        │   ├── list/
        │   ├── find/
        │   └── patch/
        ├── database/
        │   ├── repositories/  # Implementações concretas (ex.: SqlServerXXXRepository)
        │   │   └── sqlserver-<entidade>-repository.ts
        │   └── mappers/       # Domain <-> persistência
        │       └── sqlserver-<entidade>-mapper.ts
        ├── http/
        │   └── routes/        # Rotas específicas da entidade
        │       └── <entidade>.routes.ts
        ├── presenter/         # Formatação da resposta para o cliente
        │   └── <entidade>-presenter.ts
        ├── schemas/           # Schemas de persistência (quando aplicável)
        └── providers/         # Provedores específicos da entidade (quando aplicável)
​
Exemplo Concreto: Entidade location
src/modules/wms
├── application/location/
│   └── use-cases/
│       ├── actions/
│       ├── assign/
│       │   └── assign-location-block-to-location-use-case.ts
│       ├── create/
│       │   └── create-location-use-case.ts
│       ├── delete/
│       │   └── delete-location-use-case.ts
│       ├── find/
│       │   ├── by-coordinates/
│       │   ├── by-id/
│       │   └── by-name/
│       ├── list/
│       │   └── list-location-use-case.ts
│       ├── patch/
│       └── update/
│           └── update-location-use-case.ts
├── domain/location/
│   ├── entities/
│   │   ├── location.ts
│   │   ├── location-location-block.ts
│   │   └── location-location-block-list.ts
│   ├── enums/
│   │   ├── location-status.ts
│   │   ├── location-type.ts
│   │   └── location-visible.ts
│   ├── languages/
│   │   ├── en.ts
│   │   ├── es.ts
│   │   └── pt.ts
│   └── repositories/
│       ├── location-repository.ts
│       └── location-location-block-repository.ts
└── infra/location/
    ├── controllers/
    │   ├── assign-location-block/
    │   ├── create/
    │   ├── delete/
    │   ├── find/
    │   ├── list/
    │   ├── patch/
    │   └── update/
    ├── database/
    │   ├── mappers/
    │   │   └── sqlserver-location-mapper.ts
    │   └── repositories/
    │       └── sqlserver-location-repository.ts
    ├── http/
    │   └── routes/
    │       └── location.routes.ts
    ├── presenter/
    │   └── location-presenter.ts
    ├── providers/
    └── schemas/
​
Estrutura de test/
Os testes seguem a mesma estrutura de src/, facilitando a navegação:
test
├── test-setup.ts           # Configuração global de testes
├── core/                   # Testes de utilitários core
├── infra/                  # Testes de infraestrutura
├── modules/                # Testes de módulos (espelhando src/modules)
│   ├── core/
│   ├── host/
│   ├── iam/
│   ├── wcs/
│   └── wms/
│       └── application/
│           └── location/
│               └── use-cases/
│                   ├── create/
│                   │   └── create-location-use-case.spec.ts
│                   ├── delete/
│                   ├── list/
│                   └── update/
└── utils/                  # Utilitários de teste
    ├── create-stock-e2e.ts # Factory para criação de estoque em E2E
    ├── iam-login-e2e.ts    # Helper de login para testes E2E
    ├── reset-db.ts         # Reset do banco de dados para testes
    └── setup-e2e.ts        # Setup geral para testes E2E
​
Tipos de teste:
Testes unitários - Localizados junto aos casos de uso em test/modules/
Testes E2E - Testam controllers e integração completa
Configurados via vitest.e2e.config.ts
Usam banco de dados de teste (Docker)
Guia rápido para novos módulos/entidades
Ao criar uma nova entidade em qualquer módulo (core, host, iam, wcs, wms):
1. Domínio
Crie src/modules/<modulo>/domain/<entidade>/ com:
entities/ - Entidade principal com método estático create()
repositories/ - Interface do repositório (abstract class)
enums/ - Enumerações específicas (se necessário)
languages/ - Mensagens de erro/validação em en.ts, es.ts, pt.ts
2. Aplicação
Crie src/modules/<modulo>/application/<entidade>/use-cases/ com os casos de uso
Cada use case deve ter:
Interface <UseCase>Request com parâmetros
Type <UseCase>Response com retorno
Classe decorada com @injectable()
Método execute() com lógica de negócio
Injeção de dependências via constructor com @inject()
3. Infraestrutura - Persistência
Crie src/modules/<modulo>/infra/<entidade>/database/:
repositories/sqlserver-<entidade>-repository.ts - Implementação do repositório
mappers/sqlserver-<entidade>-mapper.ts - Conversão domain ↔ database
4. Infraestrutura - HTTP
Crie src/modules/<modulo>/infra/<entidade>/:
controllers/<acao>/ - Um controller por caso de uso
<acao>-<entidade>.controller.ts
<acao>-<entidade>.schema.ts - Schema Zod de validação
http/routes/<entidade>.routes.ts - Rotas Fastify
presenter/<entidade>-presenter.ts - Formatação de resposta (se necessário)
5. Testes
Crie testes unitários em test/modules/<modulo>/application/<entidade>/use-cases/
Nomeie como <use-case>.spec.ts
6. Dependências
Registre repositório nos providers (src/infra/providers/)
Adicione rotas em arquivos de rotas do módulo ou em src/infra/http/routes/index.ts
Seguindo esse padrão, o projeto permanece consistente e facilita a navegação e manutenção para toda a equipe.
