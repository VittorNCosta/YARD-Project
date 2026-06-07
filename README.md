# YARD Project

Aplicacao para controle operacional de patio: cadastro de veiculos, autorizacoes de entrada, movimentacoes, docas, pesagem e usuarios.

## Estrutura

- `backend`: API Fastify + TypeScript + MongoDB/Mongoose.
- `frontend`: React + TypeScript + Vite.
- `.github/workflows/ci.yml`: validacoes automaticas em push e pull request.

## Requisitos

- Node.js 22.
- npm.
- MongoDB acessivel pelo backend, via Atlas ou instancia local.
- Docker Desktop, opcional, para subir MongoDB local com `docker compose`.

## Variaveis de Ambiente

Backend:

```bash
cd backend
copy .env.example .env
```

Preencha `backend/.env` com uma `MONGO_URI` valida e segredos de pelo menos 32 caracteres.

Para usar MongoDB local via Docker:

```env
MONGO_URI=mongodb://localhost:27017/yardcontrol
```

Frontend:

```bash
cd frontend
copy .env.example .env
```

O padrao esperado para desenvolvimento local e:

```env
VITE_API_URL=http://localhost:3000/api
```

## Como Rodar Localmente

Instale dependencias:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

Se for usar banco local, suba o MongoDB antes do backend:

```bash
docker compose up -d mongo
```

Suba primeiro o backend:

```bash
cd backend
npm run dev
```

O script do backend ja inicia o Node com `--use-system-ca`, necessario nesta maquina para confiar no certificado TLS do MongoDB Atlas.

Depois suba o frontend:

```bash
cd frontend
npm run dev
```

URLs esperadas:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/api`

Para parar o MongoDB local:

```bash
docker compose down
```

Para apagar tambem os dados locais do MongoDB:

```bash
docker compose down -v
```

## Validacoes Locais

Backend:

```bash
cd backend
npm run lint:check
npm run test:unit
npm run test:e2e
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## CI

O CI roda em maquinas temporarias Ubuntu no GitHub Actions. Ele nao publica a aplicacao nem sobe servidor permanente; apenas valida o codigo em ambiente limpo.

Jobs atuais:

- Backend: instala dependencias, roda typecheck, testes unitarios e testes E2E com MongoDB em memoria.
- Frontend: instala dependencias, roda lint e build.

## Proximo Fluxo de Produto

Depois que a conexao com o MongoDB estiver funcionando, validar manualmente:

1. Criar usuario e autenticar.
2. Criar veiculo.
3. Criar autorizacao de entrada.
4. Avancar status da movimentacao.
5. Confirmar regra de pesagem conforme cadastro do veiculo.
6. Conferir diferenca de peso e historico da movimentacao.
