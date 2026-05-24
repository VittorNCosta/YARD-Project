# Yard Business Rules

Este documento fecha o contrato de negocio da operacao de patio para o MVP do
YardControl. Ele deve orientar backend, frontend, testes e futuras migracoes.

## Decisao de modelo

`Vehicle` representa cadastro/frota. Ele responde perguntas como:

- Qual e a placa?
- Qual e o tipo/cor do veiculo?
- O veiculo esta cadastralmente ativo ou inativo?
- O veiculo exige pesagem por padrao?

`YardMovement` representa uma visita/movimentacao real no patio. Ela responde:

- Quem chegou?
- Quando chegou?
- Qual carga/processo esta sendo atendido?
- Em qual etapa operacional esta?
- Qual doca, pesos, datas e responsaveis foram usados?

Essa separacao evita misturar status cadastral `Ativo/Inativo` com status
operacional como `Fila`, `Patio`, `Doca` e `Finalizado`.

## Entidades do dominio

### Vehicle

Responsavel por cadastro.

Campos principais:

- `plate`
- `color`
- `vehicleType`
- `activeStatus`
- `weighingRequired`
- `createdAt`
- `updatedAt`

Regras:

- Placa deve ser unica no cadastro.
- Veiculo inativo nao pode abrir nova movimentacao.
- Inativar veiculo nao cancela movimentacao aberta automaticamente.
- Remover veiculo com historico operacional deve ser evitado; preferir inativar.

### YardMovement

Responsavel pela operacao de patio.

Campos principais:

- `vehicleId`
- `plateSnapshot`
- `driverName`
- `driverCpf`
- `cargoType`
- `processType`
- `status`
- `weighingRequired`
- `entryWeight`
- `exitWeight`
- `dock`
- `arrivalDate`
- `departureDate`
- `createdBy`
- `releasedBy`
- `cancelledBy`
- `statusReason`
- `events`
- `createdAt`
- `updatedAt`

Regras:

- Uma placa nao pode ter duas movimentacoes abertas ao mesmo tempo.
- Movimentacao finalizada, cancelada ou recusada nao pode voltar para fluxo ativo.
- Alteracao de status deve seguir somente a matriz permitida.
- Campos de auditoria devem preservar datas e responsaveis de cada evento critico.

### Dock

Responsavel pela capacidade operacional de docas.

No MVP, `Dock` ja e uma entidade propria. A ocupacao operacional continua
derivada de `YardMovement` em status `DOCKED`, enquanto cadastro, ativacao e
manutencao ficam na collection `docks`.

Campos principais:

- `code`
- `name`
- `status`
- `maintenanceReason`
- `createdAt`
- `updatedAt`

Status:

- `ACTIVE`
- `INACTIVE`
- `MAINTENANCE`

Regras:

- Codigo da doca deve ser unico.
- Uma doca ocupada nao pode receber outra movimentacao.
- Somente doca `ACTIVE` pode receber movimentacao.
- Doca `INACTIVE` ou `MAINTENANCE` nao pode receber movimentacao.
- Ao mover uma movimentacao para `DOCKED`, a doca e considerada ocupada.
- Ao sair de `DOCKED` para `AWAITING_RELEASE`, o campo `dock` e limpo e a doca
  fica disponivel para nova movimentacao.
- O cadastro inicial de docas pode ser criado com `npm run seed:docks` dentro
  de `backend`.

## Status operacional da movimentacao

Status ativos:

- `WAITING_QUEUE`: veiculo registrado e aguardando chamada.
- `GATE_CHECK`: veiculo em validacao de portaria.
- `ENTRY_WEIGHING`: pesagem de entrada pendente ou em andamento.
- `YARD`: veiculo dentro do patio aguardando doca.
- `DOCKED`: veiculo em doca.
- `AWAITING_RELEASE`: processo concluido na doca, aguardando liberacao.
- `EXIT_WEIGHING`: pesagem de saida pendente ou em andamento.
- `RELEASED`: liberado para sair.

Status finais:

- `FINISHED`: movimentacao encerrada com saida concluida.
- `CANCELLED`: movimentacao cancelada por decisao operacional.
- `REJECTED`: entrada recusada antes de concluir o fluxo.

## Matriz de transicoes permitidas

| Origem | Destinos permitidos |
| --- | --- |
| `WAITING_QUEUE` | `GATE_CHECK`, `CANCELLED` |
| `GATE_CHECK` | `ENTRY_WEIGHING`, `YARD`, `REJECTED`, `CANCELLED` |
| `ENTRY_WEIGHING` | `YARD`, `CANCELLED` |
| `YARD` | `DOCKED`, `CANCELLED` |
| `DOCKED` | `AWAITING_RELEASE`, `CANCELLED` |
| `AWAITING_RELEASE` | `EXIT_WEIGHING`, `RELEASED`, `CANCELLED` |
| `EXIT_WEIGHING` | `RELEASED`, `CANCELLED` |
| `RELEASED` | `FINISHED` |
| `FINISHED` | nenhum |
| `CANCELLED` | nenhum |
| `REJECTED` | nenhum |

## Regras por transicao

### Criar movimentacao

- Exige `vehicleId`, `plateSnapshot`, `driverName` e `cargoType`.
- Status inicial padrao: `WAITING_QUEUE`.
- `arrivalDate` deve ser preenchida na criacao.
- `createdBy` deve receber o usuario logado.
- Um evento `CREATED` deve ser registrado em `events`.
- `departureDate`, `entryWeight`, `exitWeight`, `dock` e `releasedBy` iniciam vazios.

### `GATE_CHECK` para `ENTRY_WEIGHING`

- Permitido quando `weighingRequired` for `true`.
- Se `weighingRequired` for `false`, a movimentacao deve ir para `YARD`.

### `GATE_CHECK` para `YARD`

- Permitido quando `weighingRequired` for `false`.
- Se `weighingRequired` for `true`, deve passar por `ENTRY_WEIGHING`.

### `ENTRY_WEIGHING` para `YARD`

- Exige `entryWeight`.
- `entryWeight` deve ser maior que zero.

### `YARD` para `DOCKED`

- Exige `dock`.
- A doca precisa estar disponivel.

### `DOCKED` para `AWAITING_RELEASE`

- Exige processo de doca concluido.
- Libera a doca para nova movimentacao.

### `AWAITING_RELEASE` para `EXIT_WEIGHING`

- Permitido quando `weighingRequired` for `true`.

### `AWAITING_RELEASE` para `RELEASED`

- Permitido quando `weighingRequired` for `false`.
- Exige `releasedBy`.
- `releasedBy` deve ser preenchido automaticamente com o usuario logado.

### `EXIT_WEIGHING` para `RELEASED`

- Exige `exitWeight`.
- `exitWeight` deve ser maior que zero.
- Exige `releasedBy`.
- `releasedBy` deve ser preenchido automaticamente com o usuario logado.

### `RELEASED` para `FINISHED`

- Define `departureDate`.
- Encerra movimentacao.

### Cancelar ou recusar

- `CANCELLED` pode ocorrer enquanto a movimentacao ainda esta ativa.
- `REJECTED` so deve ocorrer durante validacao de portaria.
- Ambos exigem `statusReason`.
- `statusReason` deve registrar o motivo operacional informado pelo usuario.
- `CANCELLED` deve registrar `cancelledBy` com o usuario logado.
- Cada alteracao de status deve registrar um evento `STATUS_CHANGED` em
  `events`, contendo status anterior, status novo, usuario, data e dados
  operacionais informados na transicao.

## Regras de consulta e dashboard

Dashboard deve ser calculado a partir de movimentacoes, nao do cadastro de
veiculos:

- Fila: `WAITING_QUEUE`
- Portaria: `GATE_CHECK`
- Pesagem: `ENTRY_WEIGHING` e `EXIT_WEIGHING`
- Patio: `YARD`
- Docas: `DOCKED`
- Aguardando liberacao: `AWAITING_RELEASE`
- Liberados: `RELEASED`
- Finalizados do dia: `FINISHED` com `departureDate` no dia atual

## Fora do MVP

Nao implementar ainda:

- Agendamento antecipado.
- Controle multi-unidade.
- Integracao com balanca fisica.
- OCR/leitura automatica de placa.
- Alocacao automatica de doca.

Esses pontos devem usar o mesmo dominio quando entrarem no roadmap.
