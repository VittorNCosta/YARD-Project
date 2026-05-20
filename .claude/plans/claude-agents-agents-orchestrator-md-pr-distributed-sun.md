# Plano — Sistema de Autenticação + RBAC + CRUD de Usuários

## Contexto

O projeto **YardProject** hoje só tem o módulo `vehicle` no backend (DDD/Clean Arch + Fastify + Mongoose + MongoDB + tsyringe + Zod + Vitest) e um frontend React 19 sem nenhuma camada de autenticação (rotas públicas, `services/api.ts` sem credenciais, `Header` sem login/logout). O usuário pediu um sistema completo de auth profissional, com foco em segurança (OWASP), JWT em cookie HttpOnly, RBAC (admin/user), CRUD de usuários e telas de Login/Cadastro/Dashboard/Users.

O prompt original sugeria Express + Prisma + PostgreSQL + Tailwind + Axios, mas o `IA_rules.md` é explícito: **"nunca produzir código fora deste padrão"**. Por isso o plano adapta o pedido ao stack do projeto (Fastify + Mongoose + Mongo + tokens.css + fetch), preservando 100% dos requisitos de segurança que são agnósticos de framework. Decisões confirmadas com o usuário:

- Backend: Fastify + Mongoose + MongoDB (não Express/Prisma/Postgres).
- Frontend CSS: tokens.css + components.css (não Tailwind).
- Forms: instalar `react-hook-form` + `zod` + `@hookform/resolvers`; manter `fetch` no `api.ts` existente.

A entrega final é um pipeline orquestrado pelo **Agents Orchestrator**, com Backend Architect e Frontend Developer implementando, EvidenceQA validando cada tarefa, e Security Engineer fazendo o review final.

---

## Stack final

| Camada | Ferramenta | Status |
|---|---|---|
| Backend runtime | Bun | já instalado |
| Backend framework | Fastify 5 | já instalado |
| ORM/ODM | Mongoose 8 | já instalado |
| Banco | MongoDB | já instalado |
| DI | tsyringe | já instalado |
| Validação | Zod | já instalado |
| Testes | Vitest | já instalado |
| JWT | jsonwebtoken 9 | já instalado |
| Hash | **bcrypt** | **a instalar** |
| Headers | **@fastify/helmet** | **a instalar** |
| Cookies | **@fastify/cookie** | **a instalar** |
| Rate limit | **@fastify/rate-limit** | **a instalar** |
| Frontend | React 19 + Vite + Router 7 | já instalado |
| Forms | **react-hook-form + zod + @hookform/resolvers** | **a instalar** |
| HTTP | fetch nativo (`services/api.ts` atual) | manter |
| Icons | lucide-react | já instalado |

---

## Arquitetura backend (segue o padrão do módulo `vehicle`)

### Novo módulo `user` — `backend/src/modules/user/`

```
user/
├── domain/user/
│   ├── entities/user.ts                    # Entidade rica, sem mongoose; passwordHash nunca exposto
│   ├── enums/user-role.ts                  # ADMIN | USER
│   ├── repositories/user-repository.ts     # Abstract class
│   └── languages/{en,es,pt}.ts             # Mensagens de erro (USER_NOT_FOUND, EMAIL_ALREADY_EXISTS, etc.)
├── application/user/use-cases/
│   ├── create/create-user-use-case.ts
│   ├── list/list-user-use-case.ts          # com paginação (page, perPage) + busca (q por name/email)
│   ├── find/by-id/find-user-by-id-use-case.ts
│   ├── update/update-user-use-case.ts
│   ├── update-role/update-user-role-use-case.ts
│   └── delete/delete-user-use-case.ts
└── infra/user/
    ├── database/
    │   ├── schemas/user.schema.ts          # Mongoose: email único+índice, passwordHash select:false
    │   ├── mappers/mongo-user-mapper.ts
    │   └── repositories/mongo-user-repository.ts
    ├── controllers/{create,list,find-by-id,update,update-role,delete}/
    │   └── *.controller.ts + *.schema.ts   # Zod schemas; nunca incluem passwordHash em response
    ├── http/routes/user.routes.ts          # CRUD protegido por ensureAuthenticated + ensureRole(ADMIN)
    ├── presenter/user-presenter.ts         # toHTTP() omite passwordHash
    └── providers/user.provider.ts          # DI bindings
```

Endpoints expostos:
- `GET    /api/users`         — admin only, com `?page&perPage&q`
- `GET    /api/users/:id`     — admin ou o próprio user
- `POST   /api/users`         — admin only
- `PUT    /api/users/:id`     — admin ou o próprio user (mas só admin muda role — via endpoint dedicado)
- `PATCH  /api/users/:id/role` — admin only
- `DELETE /api/users/:id`     — admin only

### Novo módulo `auth` — `backend/src/modules/auth/`

```
auth/
├── domain/auth/
│   ├── entities/session.ts                 # refresh-token persistido (id, userId, hash, expiresAt, revokedAt, ua, ip)
│   ├── repositories/session-repository.ts  # findByIdHash, create, revoke, revokeAllForUser
│   ├── services/                           # ABSTRAÇÕES (DDD): assinaturas sem deps externas
│   │   ├── hash-service.ts                 # abstract: hash/compare
│   │   └── token-service.ts                # abstract: signAccess/signRefresh/verify
│   └── languages/{en,es,pt}.ts             # INVALID_CREDENTIALS, SESSION_EXPIRED, FORBIDDEN, RATE_LIMITED
├── application/auth/use-cases/
│   ├── register/register-user-use-case.ts  # delega CreateUserUseCase + login automático
│   ├── login/login-use-case.ts             # busca user, compara hash, cria session, devolve tokens
│   ├── refresh/refresh-token-use-case.ts   # valida refresh, rotaciona, revoga o antigo
│   ├── logout/logout-use-case.ts           # revoga session
│   └── me/get-authenticated-user-use-case.ts
└── infra/auth/
    ├── database/
    │   ├── schemas/session.schema.ts
    │   ├── mappers/mongo-session-mapper.ts
    │   └── repositories/mongo-session-repository.ts
    ├── services/
    │   ├── bcrypt-hash.service.ts          # implementa HashService com bcrypt (cost=12)
    │   └── jwt-token.service.ts            # implementa TokenService (HS256, secrets do env)
    ├── controllers/{register,login,logout,refresh,me}/
    │   └── *.controller.ts + *.schema.ts   # set/clear cookies HttpOnly + Secure + SameSite=Lax
    ├── http/routes/auth.routes.ts
    └── providers/auth.provider.ts          # DI: HashService→Bcrypt, TokenService→JWT, SessionRepository→Mongo
```

Endpoints:
- `POST /api/auth/register`  — público (rate-limit 5/min/IP)
- `POST /api/auth/login`     — público (rate-limit 5/min/IP+email)
- `POST /api/auth/refresh`   — usa cookie de refresh, rotaciona
- `POST /api/auth/logout`    — autenticado, revoga session corrente
- `GET  /api/auth/me`        — autenticado, devolve user atual

### Camada compartilhada — alterações em `backend/src/infra/`

- **`infra/http/middlewares/ensure-authenticated.ts`** — Fastify decorator: lê cookie `access_token`, verifica via `TokenService`, popula `request.user = { id, role }`. Retorna 401 padronizado.
- **`infra/http/middlewares/ensure-role.ts`** — `(role: UserRole) => preHandler` que checa `request.user.role`. Retorna 403.
- **`infra/http/app.ts`** — registrar (na ordem):
  1. `@fastify/helmet` com CSP estrita (script-src 'self', img-src 'self' data:, frame-ancestors 'none', HSTS, noSniff, frameguard).
  2. `@fastify/cookie` com `COOKIE_SECRET`.
  3. `@fastify/cors` apertado (`origin: env.FRONTEND_URL`, `credentials: true`, sem `*`).
  4. `@fastify/rate-limit` global (100 req/min/IP) + override por rota nos endpoints de auth.
  5. Decoradores `ensureAuthenticated` / `ensureRole`.
  6. Routes (existentes + novas).
  7. Error handler (já existe — confirmar que não vaza stack trace em prod; usar `env.NODE_ENV`).
- **`infra/setup/setup-providers.ts`** — registrar `UserProvider`, `AuthProvider`.
- **`infra/http/routes/index.ts`** — registrar `userRoutes`, `authRoutes`.
- **`config/env.ts`** — adicionar com Zod: `JWT_ACCESS_SECRET` (min 32), `JWT_REFRESH_SECRET` (min 32), `JWT_ACCESS_TTL` (default `15m`), `JWT_REFRESH_TTL` (default `7d`), `COOKIE_SECRET` (min 32), `FRONTEND_URL` (URL).
- **`backend/.env.example`** — refletir as novas vars com placeholders.

### Cookies — política exata

| Cookie | Conteúdo | Flags |
|---|---|---|
| `access_token` | JWT 15min, payload `{sub, role}` | HttpOnly, Secure (prod), SameSite=Lax, Path=/, signed |
| `refresh_token` | JWT 7d, payload `{sub, sid}` | HttpOnly, Secure (prod), SameSite=Lax, Path=/api/auth, signed |

Rotação: `/auth/refresh` revoga `sid` antigo e emite novo par. Logout revoga `sid` (DB) e limpa cookies.

### Vincular usuário a veículo (proteger rotas existentes)

Atualizar `backend/src/modules/vehicle/infra/vehicle/http/routes/vehicle.routes.ts` para todas as rotas terem `onRequest: [app.ensureAuthenticated]`. Operações destrutivas (DELETE /:id) ganham `[app.ensureAuthenticated, app.ensureRole(UserRole.ADMIN)]`.

### Testes (Vitest)

- `backend/test/modules/user/` — espelha o pattern de vehicle. Cobertura mínima:
  - `application/user/use-cases/create/*.spec.ts` — hash aplicado, email duplicado falha.
  - `application/user/use-cases/list/*.spec.ts` — paginação + busca.
- `backend/test/modules/auth/` — cobertura mínima:
  - `login-use-case.spec.ts` — credenciais válidas, inválidas, hash incorreto.
  - `refresh-token-use-case.spec.ts` — rotação revoga o antigo.
  - `logout-use-case.spec.ts` — revoga session.
- In-memory repos: `InMemoryUserRepository`, `InMemorySessionRepository`, `FakeHashService` (compara plaintext), `FakeTokenService`.
- Factories: `makeUser({ password? })`, `makeSession()`.
- E2E (vitest.e2e.config.ts já existe): fluxo `register → login → me → refresh → logout` validando cookies via `app.inject()`.

---

## Arquitetura frontend

### Novas dependências
```
npm i react-hook-form zod @hookform/resolvers
```

### Novos arquivos

```
frontend/src/
├── services/
│   ├── api.ts                    # ATUALIZAR: adicionar credentials:"include"; auto-refresh em 401
│   └── auth.ts                   # NOVO: login(), register(), logout(), me(), refresh()
├── contexts/
│   └── AuthContext.tsx           # NOVO: { user, loading, login, logout, register, isAdmin }
├── components/
│   ├── ProtectedRoute.tsx        # NOVO: redirect /login se !user
│   ├── RoleGuard.tsx             # NOVO: redirect / se !isAdmin
│   ├── Toast.tsx + Toast.css     # NOVO: provider mínimo (success/error/info), sem lib externa
│   └── Header.tsx                # ATUALIZAR: mostra user.name, link "Usuários" só admin, botão Sair
├── pages/
│   ├── Login.tsx + Login.css     # NOVO: RHF + zod, mostra erros de campo, loading no submit
│   ├── Register.tsx + Register.css # NOVO
│   └── Users.tsx + Users.css     # NOVO: tabela admin (CRUD + busca + paginação), reaproveita componentes/CSS de vehicles
└── app/
    └── App.tsx                   # ATUALIZAR: AuthProvider, ToastProvider, rotas /login /register /usuarios protegidas
```

### Detalhes de comportamento

- **AuthProvider** chama `auth.me()` no mount; enquanto carrega, mostra spinner global. Sucesso popula `user`; falha deixa `null`.
- **ProtectedRoute**: se `!user && !loading`, `<Navigate to="/login" state={{ from }} replace />`.
- **RoleGuard**: aceita `role="admin"`; se user não tem, redireciona para `/` com toast.
- **api.ts** — wrapper único: ao receber 401 numa request que não é `/auth/*`, dispara um `auth.refresh()`. Se o refresh falhar, faz logout + redireciona pra `/login`. Implementação com `Promise` única para evitar tempestade de refreshes paralelos.
- **Forms** (`Login`, `Register`, `Users` create/edit): RHF + zodResolver. Schema de senha: min 8, ao menos 1 letra e 1 número. Mensagens de erro vêm tanto do schema (front) quanto do backend (mostradas em toast quando 4xx genérico, ou ligadas ao campo via `setError`).
- **Visual**: reusa `tokens.css`, `components.css`, e o estilo `modal-card`/`form-grid`/`form-field` do redesign de Veículos. Login/Register são páginas centradas com card único; Users replica a estrutura da página de Veículos (KPIs opcionais, toolbar, tabela, modal).
- **Toasts**: provider próprio (`useToast()`) com 3 níveis e auto-dismiss. Mantém zero-deps extras.
- **Logout**: chama `auth.logout()`, limpa context, redireciona pra `/login`.
- **Rotas finais** (em `App.tsx`):
  - Públicas: `/login`, `/register`.
  - Protegidas (envolvidas por `<ProtectedRoute>`): `/`, `/veiculos`.
  - Admin (envolvidas por `<RoleGuard role="admin">`): `/usuarios`.

---

## Arquivos críticos a tocar

| Caminho | Ação |
|---|---|
| `backend/package.json` | adicionar deps: bcrypt, @types/bcrypt, @fastify/helmet, @fastify/cookie, @fastify/rate-limit |
| `backend/src/config/env.ts` | adicionar JWT_*, COOKIE_SECRET, FRONTEND_URL |
| `backend/.env.example` | refletir novas vars |
| `backend/src/infra/http/app.ts` | registrar helmet/cookie/rate-limit/decorators na ordem correta |
| `backend/src/infra/http/middlewares/ensure-authenticated.ts` | criar |
| `backend/src/infra/http/middlewares/ensure-role.ts` | criar |
| `backend/src/infra/http/routes/index.ts` | registrar userRoutes, authRoutes |
| `backend/src/infra/setup/setup-providers.ts` | registrar UserProvider, AuthProvider |
| `backend/src/modules/user/**` | criar módulo completo (DDD 3 camadas) |
| `backend/src/modules/auth/**` | criar módulo completo (DDD 3 camadas) |
| `backend/src/modules/vehicle/infra/vehicle/http/routes/vehicle.routes.ts` | adicionar `onRequest: [app.ensureAuthenticated]` em todas as rotas; ADMIN no DELETE |
| `backend/test/modules/user/**` + `backend/test/modules/auth/**` | specs novos |
| `frontend/package.json` | adicionar react-hook-form, zod, @hookform/resolvers |
| `frontend/src/services/api.ts` | `credentials:"include"`, refresh-on-401 |
| `frontend/src/services/auth.ts` | criar |
| `frontend/src/contexts/AuthContext.tsx` | criar |
| `frontend/src/components/{ProtectedRoute,RoleGuard,Toast}.tsx` | criar |
| `frontend/src/components/Header.tsx` | mostrar user, link admin, logout |
| `frontend/src/pages/{Login,Register,Users}.tsx + .css` | criar |
| `frontend/src/app/App.tsx` | wrapping + rotas |
| `frontend/.env.example` | confirmar `VITE_API_URL` |

---

## Padrões reutilizados (não criar duplicado)

- **Use-Case base pattern**: copiar o esqueleto de `backend/src/modules/vehicle/application/vehicle/use-cases/create/create-vehicle-use-case.ts` (`@injectable`, `@inject` por token, request/response types exportados).
- **Controller + schema**: `backend/src/modules/vehicle/infra/vehicle/controllers/create/*` (Zod via `zodValidationSchema`, `container.resolve`, `HttpStatusCode`, presenter).
- **Repository abstract + Mongo impl**: `vehicle-repository.ts` (domain) + `mongo-vehicle-repository.ts` (infra).
- **Mapper**: `mongo-vehicle-mapper.ts`.
- **Provider DI**: `vehicle.provider.ts` (registerSingleton em token string + class).
- **Erros**: `UseCaseError("LANG_KEY", HttpStatusCode.X)` + chaves traduzidas em `domain/<entity>/languages/{en,es,pt}.ts`.
- **Frontend visual**: classes `modal-card`, `form-grid`, `form-field`, `btn--primary`, `status-badge` já estão prontas em `frontend/src/styles/components.css` e `frontend/src/pages/vehicles.css`. Login/Register/Users devem consumi-las, não recriar.

---

## Orquestração (pipeline Agents Orchestrator)

Conforme `[.claude/agents/agents-orchestrator.md](.claude/agents/agents-orchestrator.md)`, executar em fases com gates de qualidade:

1. **Fase Backend — Backend Architect** (uma task por vez, validação por EvidenceQA + testes Vitest):
   1. Atualizar `env.ts`, `.env.example`, instalar deps backend.
   2. Criar abstrações em `core` ou em `domain/auth/services` (HashService, TokenService).
   3. Criar módulo `user` (DDD completo + tests).
   4. Criar módulo `auth` (DDD completo + tests).
   5. Atualizar `infra/http/app.ts` (helmet, cookie, rate-limit, CORS travado).
   6. Criar middlewares `ensureAuthenticated` / `ensureRole`.
   7. Proteger rotas existentes de `vehicle`.
   8. Rodar `bun test` + `bun lint:check` (gate).
2. **Fase Frontend — Frontend Developer**:
   1. Instalar deps frontend.
   2. `api.ts` com `credentials:"include"` + refresh-on-401.
   3. `services/auth.ts` + `AuthContext` + `ProtectedRoute` + `RoleGuard` + `Toast`.
   4. Páginas `Login`, `Register`.
   5. Página `Users` (CRUD + paginação + busca).
   6. Atualizar `Header` + `App.tsx`.
   7. `npx tsc -b && npx vite build` (gate).
3. **Fase Segurança — Security Engineer**: review do código antes de marcar concluído. Checklist OWASP (cookies, CSP, rate-limit, sanitização, mensagens de erro genéricas, secrets fora do código, sem stack trace em prod).
4. **Fase QA final — EvidenceQA**: smoke manual no browser do fluxo register → login → CRUD users → role guard → logout.

---

## Verificação end-to-end

**Backend isolado:**
```bash
cd backend
bun install
cp .env.example .env  # preencher segredos com 32+ chars
bun test:run
bun lint:check
bun run dev
```
Smoke via curl (cookies em jar):
```bash
curl -c jar -b jar -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"a@a.com","password":"Senha123"}'
curl -c jar -b jar http://localhost:3000/api/auth/me
curl -c jar -b jar -X POST http://localhost:3000/api/auth/refresh
curl -c jar -b jar -X POST http://localhost:3000/api/auth/logout
```

**Frontend isolado:**
```bash
cd frontend
npm install
npx tsc -b
npx vite build
npm run dev
```
Smoke no browser:
1. Abrir `/login` — campos validam (zod), submit chama backend.
2. Logar — redireciona pra `/`. DevTools → Application → Cookies: `access_token` + `refresh_token` HttpOnly.
3. Abrir `/usuarios` como user comum → redireciona pra `/` com toast "Acesso negado".
4. Logar como admin → `/usuarios` lista, busca, criar/editar/deletar funcionam.
5. Esperar access expirar (ou forçar TTL=10s no .env de dev) → próxima request silenciosamente refaz e sucede; se refresh expirou, redireciona pra `/login`.
6. Clicar Sair → cookies limpos, rotas protegidas voltam pra `/login`.

**Verificação de segurança:**
- DevTools → Network: cookies marcados HttpOnly, SameSite=Lax (Secure só em prod).
- Response do `/auth/login` **não** contém `passwordHash` nem o JWT em corpo.
- Tentar 6 logins com senha errada em <1min → resposta 429.
- Headers de resposta contêm `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`.
- `localStorage.token` no console: `undefined` (token nunca toca JS).
- CORS: requisição de outro origin é bloqueada.
