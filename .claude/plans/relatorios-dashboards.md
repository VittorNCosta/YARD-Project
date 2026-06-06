# Plano de Implementação — Tela de Relatórios + Captura de Fluxo de Pátio

> Gerado a partir da análise do código-fonte (módulos `auth`, `user`, `vehicle` no
> backend; React + Vite no frontend). Segue [IA_rules.md](../../IA_rules.md),
> [STYLE_GUIDE.md](../../STYLE_GUIDE.md) e [FOLDER_STRUCTURE.md](../../FOLDER_STRUCTURE.md).

## Decisões confirmadas com o time
- **Escopo:** completo — inclui criar a **captura do fluxo operacional** (entrada → doca → saída) que alimenta os dashboards operacionais.
- **Gráficos:** adicionar **recharts** no frontend.
- **Dashboard mock:** além da nova tela de Relatórios, **conectar o Dashboard atual a dados reais**.

---

## 1. Diagnóstico do estado atual

| Item | Situação |
|---|---|
| Rota `/relatorios` | ❌ Não existe — `Header.tsx:49` aponta para âncora morta `#relatorios` |
| `Dashboard.tsx` | ⚠️ 100% mock hardcoded, sem backend |
| Backend de métricas | ❌ Inexistente — só `GET /vehicles` (lista tudo) |
| Captura de fluxo | ❌ Form de cadastro só coleta dados cadastrais; campos operacionais do `vehicle` nunca são preenchidos |
| Gráficos | ❌ Sem lib (só barras CSS) |

**Dados coletados hoje:** `plate`, `color`, `driverName`, `driverCpf`, `vehicleType`
(Truck/Van/Carreta/Toco/Bitrem/VUC), `weighingRequired`, `activeStatus`, `createdAt`.

**Campos operacionais existentes mas nunca preenchidos:** `status`, `dock`,
`processType`, `arrivalDate`, `departureDate`, `entryWeight`, `exitWeight`, `releasedBy`.
→ Por isso o escopo inclui um **módulo de movimentação** para gerar esses dados com histórico.

---

## 2. Arquitetura alvo

Separação de responsabilidades (DDD):

```
backend/src/modules/
├── vehicle/     # cadastro da frota (já existe)
├── movement/    # NOVO — captura do fluxo (visitas ao pátio, máquina de estados)
├── dock/        # NOVO (opcional) — master de docas + estado (livre/ocupada/manutenção)
└── reports/     # NOVO — leitura/agregação para a tela de Relatórios (read-only)
```

- `movement` é a **escrita** (gate-in, doca, pesagem, gate-out) e mantém histórico por visita.
- `reports` é só **leitura/agregação** — use-cases injetam `VehicleRepository`,
  `MovementRepository` e `DockRepository` e devolvem DTOs prontos pra UI.
- Endpoints de relatório: `GET /reports/fleet` e `GET /reports/yard`.

---

## 3. Dashboards (lista final)

### Frota (módulo reports → vehicle) — `GET /reports/fleet`
1. KPIs: total de veículos, % ativos, % com pesagem, nº de tipos.
2. Composição da frota por tipo (donut).
3. Status cadastral Ativos × Inativos (donut).
4. Impacto de pesagem obrigatória (barras).
5. Evolução de cadastros por mês (linha, via `createdAt`).
6. (Admin) Usuários por papel.

### Operacional (módulo reports → movement/dock) — `GET /reports/yard`
7. Ocupação de docas (livre/ocupada/manutenção).
8. Veículos por status operacional (Fila/Pátio/Doca/Finalizado).
9. Throughput diário (entradas × saídas por dia).
10. Tempo médio de permanência / dwell time (`departureDate − arrivalDate`).
11. Carga × Descarga (`processType`).
12. Pesagem: média de entrada/saída e diferença.

---

## 4. Épicos de execução

### Épico 0 — Fundação
**Frontend**
- Adicionar `recharts` ao `frontend/package.json`.
- Criar `pages/Relatorios.tsx` + `Relatorios.css` (layout de grid de cards).
- Registrar rota `/relatorios` em `app/App.tsx` dentro de `<ProtectedRoute>`.
- Trocar âncora morta por `<NavLink to="/relatorios">` em `components/Header.tsx`.
- Componentes reutilizáveis: `components/charts/MetricCard.tsx`, `ChartCard.tsx`,
  `DonutChart.tsx`, `BarChart.tsx`, `LineChart.tsx` (wrappers finos de recharts).
- `services/api.ts`: `getFleetReport()`, `getYardReport()`.
- `hooks/useReports.ts` (loading/error/empty + filtros de período).

### Épico 1 — Dashboards de Frota (entrega rápida, dados já existem)
**Backend (módulo `reports`)**
- `application/reports/use-cases/fleet-metrics/get-fleet-metrics-use-case.ts`
  (injeta `VehicleRepository` + `UserRepository`).
- Novo método agregador em `VehicleRepository` (abstract) + impl Mongo
  (`$facet`: countByType, countByActiveStatus, countByWeighing, registrationsByMonth)
  + método no in-memory repo.
- `infra/reports/controllers/fleet-metrics/` (controller + schema Zod com filtro de período).
- `infra/reports/http/routes/reports.routes.ts` → `GET /reports/fleet` (autenticado),
  registrar em `infra/http/routes/index.ts` e provider em `infra/providers`.
- Presenter no envelope `{ success, data }`.
**Frontend**
- Dashboards 1–6 consumindo `getFleetReport()`.
**Testes:** unit do use-case (in-memory) + e2e do endpoint.

### Épico 2 — Captura de Fluxo (novo módulo `movement`)
**Domínio**
- `entities/movement.ts` (vehicleId, plate denormalizada, processType, status,
  dock, arrivalDate, dockInDate, dockOutDate, departureDate, entryWeight,
  exitWeight, releasedBy, timestamps) — constructor privado + `create()`.
- `enums/movement-status.ts` (Fila, Patio, Doca, Finalizado) e `enums/process-type.ts`.
- Métodos de domínio para a **máquina de estados** (`assignDock`, `registerWeighing`,
  `finalize`) com validação de transição.
- `repositories/movement-repository.ts` (abstract) + `languages/{en,es,pt}.ts`.
**Aplicação** (use-cases): `gate-in`, `assign-dock`, `register-weighing`, `gate-out`,
`find/by-id`, `list` (com filtros), seguindo padrão `@injectable` + `execute()`.
**Infra:** schema Mongoose (`collection: movements`), mongo repo + mapper, controllers
+ schemas Zod por ação, `http/routes/movement.routes.ts`, presenter, provider.
**Frontend:** UI mínima de operação (registrar chegada / atribuir doca / pesar / finalizar)
— pode ser uma página `pages/Movimentacoes.tsx` (o link `Movimentações` do Header também
está morto hoje) ou ações no Dashboard.
**Testes:** unit das transições de estado + use-cases + e2e dos endpoints.

### Épico 3 — Dashboards Operacionais (consomem `movement`)
- `application/reports/use-cases/yard-metrics/get-yard-metrics-use-case.ts`
  (injeta `MovementRepository` [+ `DockRepository`]).
- Agregações Mongo: ocupação por doca, contagem por status, throughput por dia,
  dwell time médio, processType, pesagem.
- `GET /reports/yard` + controller/schema/presenter.
- Frontend: dashboards 7–12 + filtro de período.

### Épico 4 — Docas (opcional, recomendado p/ "Ocupação de Docas")
- Módulo `dock`: entidade Dock (numero, status: livre/ocupada/manutenção), CRUD mínimo.
- Sem ele, "ocupação de docas" deriva só dos movements em status `Doca` (sem total
  de docas nem estado de manutenção).

### Épico 5 — Conectar Dashboard mock a dados reais
- Refatorar `components/Dashboard.tsx` para consumir `getYardReport()` (KPIs, ocupação,
  tabela de veículos no pátio, status de docas) — remover todos os mocks.
- Reusar os componentes de gráfico do Épico 0.

### Épico 6 — Polimento
- Filtros (período, tipo) padronizados; export CSV / imprimir.
- i18n das novas mensagens (`{en,es,pt}.ts`).
- Estados de loading/empty/error em todos os cards.
- Acessibilidade (labels, `role`, contraste) seguindo o padrão já usado no Dashboard.
- Índices Mongo para os campos de agregação (`vehicleType`, `status`, datas).

---

## 5. Ordem sugerida e entrega de valor
1. Épico 0 + Épico 1 → **valor imediato** (relatórios de frota com dados reais).
2. Épico 2 → captura de fluxo (habilita o resto).
3. Épico 3 (+ Épico 4) → dashboards operacionais reais.
4. Épico 5 → Dashboard deixa de ser mock.
5. Épico 6 → polimento.

## 6. Execução via Agents Orchestrator
Conforme a regra do projeto, a implementação é delegada ao **Agents Orchestrator**:
PM (tasklist deste plano) → ArchitectUX (DTOs `FleetReport`/`YardReport` + layout) →
[Backend Architect → EvidenceQA] por endpoint → [Frontend Developer → EvidenceQA] por
dashboard → testing-reality-checker. Cada tarefa passa por QA antes de avançar.

## 7. Riscos
- **Maior esforço no Épico 2** (módulo novo + máquina de estados); é o caminho crítico
  dos dashboards operacionais.
- **Histórico vs snapshot:** dwell time/throughput exigem registro por visita (modelado
  no `movement`), não só o snapshot atual do `vehicle`.
- **recharts:** dependência nova — fixar versão e validar bundle/SSR-free (Vite SPA, ok).
- **Contrato `_id`:** presenters seguem o envelope legado (`_id`); manter consistência.

## 8. Definição de pronto
- Endpoints com Zod + testes unit + e2e; zero `any`; `bun lint:check` limpo.
- Tela `/relatorios` acessível, com loading/empty/error, alimentada por dados reais.
- Dashboard sem mocks. Links `Relatórios`/`Movimentações` do Header funcionais.
