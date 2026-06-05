# Email Guide — Fluxo de Recuperação de Senha

Guia completo para configurar e testar o envio de emails no YardControl, em especial o fluxo **"Esqueci minha senha"** (`POST /api/auth/forgot-password` → `POST /api/auth/reset-password`).

---

## 1. Visão geral

O backend usa **Nodemailer + SMTP genérico** ([nodemailer-email.service.ts](backend/src/modules/auth/infra/auth/services/nodemailer-email.service.ts)) para enviar o email de redefinição. Qualquer servidor SMTP serve, desde Mailpit local até provedores de produção (SendGrid, SES, Postmark, etc.).

Para **desenvolvimento local**, usamos **Mailpit** — um servidor SMTP que roda na própria máquina, sem internet, sem conta, sem limite de emails. Tudo que o backend tentar enviar fica preso numa UI web local em `http://localhost:8025`.

---

## 2. Instalação do Mailpit (uma vez só)

### Pré-requisito
- Windows 10/11 com `winget` disponível (já vem por padrão no Win11).

### Comando

Em qualquer PowerShell:

```powershell
winget install axllent.mailpit --accept-source-agreements --accept-package-agreements
```

> **Importante:** depois da instalação, **feche e abra um novo PowerShell** para o atalho `mailpit` ficar disponível no PATH.

### Verificação

```powershell
mailpit --version
```

Deve imprimir a versão (ex.: `Mailpit v1.29.5`).

---

## 3. Configuração do backend

O `backend/.env` precisa das seguintes variáveis SMTP:

```env
# SMTP — Mailpit local (dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=any
SMTP_PASS=any
SMTP_FROM=YardControl <no-reply@yardcontrol.local>
SMTP_SECURE=false
PASSWORD_RESET_TTL_MINUTES=30
```

**Notas:**
- `SMTP_USER` e `SMTP_PASS` podem ter qualquer valor — o Mailpit não autentica. Mas o Zod (`src/config/env.ts`) exige strings não-vazias.
- `SMTP_SECURE=false` está correto: o Mailpit não usa TLS na porta 1025.
- `SMTP_FROM` pode ser qualquer email — o Mailpit não valida remetente.
- `PASSWORD_RESET_TTL_MINUTES` controla por quanto tempo o link de reset vale (default 30).

Além disso, garanta que `FRONTEND_URL` aponta para o frontend (`http://localhost:5173`) — é a base do link enviado no email.

---

## 4. Subindo o Mailpit no dia-a-dia

### Opção A — Janela visível (Ctrl+C para parar)

```powershell
mailpit
```

A janela fica aberta com o log de conexões. **Não feche enquanto estiver desenvolvendo.**

### Opção B — Background (sem janela)

```powershell
Start-Process mailpit -WindowStyle Hidden
```

Roda escondido. Para parar:

```powershell
Get-Process mailpit | Stop-Process
```

Para verificar se está rodando:

```powershell
Get-Process mailpit -ErrorAction SilentlyContinue
```

### Opção C — Auto-start com o Windows

1. `Win + R` → digite `shell:startup` → Enter
2. Crie um atalho apontando para `mailpit.exe` (localização: `%LOCALAPPDATA%\Microsoft\WinGet\Packages\axllent.mailpit_Microsoft.Winget.Source_8wekyb3d8bbwe\mailpit.exe`)
3. Pronto — sobe junto com o Windows. Para desfazer, basta deletar o atalho.

---

## 5. Fluxo de teste end-to-end

### Pré-requisitos
- Mailpit rodando (`mailpit` ou Start-Process — qualquer um dos modos acima)
- Backend rodando: `cd backend; npm run dev`
- Frontend rodando: `cd frontend; npm run dev`
- Pelo menos um usuário cadastrado no banco (criado via `/register`)

### Passo a passo

1. **Mailpit UI**: abra `http://localhost:8025` — deve aparecer a inbox vazia.
2. **Solicitar reset**:
   - Acesse `http://localhost:5173/login`
   - Clique em **"Esqueci minha senha"**
   - Digite o email de um usuário cadastrado
   - Clique em **"Enviar link"**
   - Aparece banner azul: *"Se este email estiver cadastrado, você receberá um link..."*
3. **Conferir o email**:
   - Volte para `http://localhost:8025`
   - O email "Redefinição de senha — YARD Logística" aparece em segundos
   - Clique nele para visualizar (HTML + texto + headers disponíveis)
4. **Redefinir a senha**:
   - Clique no botão **"Redefinir senha"** dentro do email
   - Abre `http://localhost:5173/reset-password?token=...`
   - Digite a nova senha (mín. 8 chars, 1 letra, 1 número) e confirme
   - Clique em **"Redefinir senha"**
   - Banner de sucesso → redireciona automaticamente para `/login` em 1.5s
5. **Validar**: faça login com a senha nova.

---

## 6. Troubleshooting

### `ERR_CONNECTION_REFUSED` ao abrir `http://localhost:8025`
O Mailpit **não está rodando**. Suba com `mailpit` em um terminal novo.

### Backend reclama de SMTP no boot ou ao enviar email
- Confirme que o Mailpit está ativo: `Get-Process mailpit`
- Confirme que a porta 1025 está livre/escutando: `Get-NetTCPConnection -LocalPort 1025`
- Confirme que reiniciou o backend **depois** de salvar o `.env` (dotenv só lê no boot)

### Email não aparece no Mailpit
- Verifique no console do backend se houve erro de envio (Nodemailer loga `err.message` + `err.code`)
- Confirme `SMTP_HOST=localhost` e `SMTP_PORT=1025` no `.env`
- Confirme que o email digitado no `/forgot-password` **existe no banco** — o backend é silencioso para evitar enumeração (sempre retorna 200), mas só envia email se o usuário existir

### Link do email leva para tela em branco
O frontend precisa ter as rotas `/forgot-password` e `/reset-password` registradas em [app/App.tsx](frontend/src/app/App.tsx). Se algum dia somem, o link cai num roteador sem match.

### Token expirado / "410 Gone"
Tokens valem `PASSWORD_RESET_TTL_MINUTES` minutos (default 30) e são **single-use**. Se expirou ou já foi usado, solicite um novo em `/forgot-password`.

### `Body cannot be empty when content-type is set to 'application/json'`
Erro benigno — algum cliente bateu num endpoint com `Content-Type: application/json` mas body vazio. Não afeta o fluxo. Ignore.

---

## 7. Provedores alternativos (referência)

Quando for para **staging/produção**, troque o SMTP. O service ([nodemailer-email.service.ts](backend/src/modules/auth/infra/auth/services/nodemailer-email.service.ts)) é agnóstico — só muda o `.env`:

| Provedor | Host | Porta | Free tier | Quando usar |
|---|---|---|---|---|
| **Mailpit (local)** | `localhost` | `1025` | ♾️ ilimitado | Dev local |
| **Ethereal** | `smtp.ethereal.email` | `587` | ♾️ ilimitado | Smoke test descartável |
| **Mailtrap Sandbox** | `sandbox.smtp.mailtrap.io` | `2525` | 100/mês | Compartilhar inbox em equipe |
| **Brevo** | `smtp-relay.brevo.com` | `587` | 300/dia | Staging |
| **Resend** | `smtp.resend.com` | `465` (secure) | 100/dia, 3k/mês | Staging/prod pequeno |
| **SendGrid** | `smtp.sendgrid.net` | `587` | 100/dia | Produção |
| **AWS SES** | `email-smtp.<region>.amazonaws.com` | `587` | $0.10 / 1000 | Produção (escala) |

> **Produção:** sempre verifique seu domínio (SPF + DKIM) no provedor escolhido. Sem isso, os emails caem em spam.

---

## 8. Comandos úteis (cheat sheet)

```powershell
# Subir Mailpit
mailpit                                  # janela visível
Start-Process mailpit -WindowStyle Hidden  # background

# Controlar Mailpit
Get-Process mailpit -ErrorAction SilentlyContinue  # ver se tá rodando
Get-Process mailpit | Stop-Process                  # parar

# Conferir portas
Get-NetTCPConnection -LocalPort 1025    # SMTP
Get-NetTCPConnection -LocalPort 8025    # UI

# Reiniciar backend depois de mexer no .env
# (no terminal do backend: Ctrl+C, depois)
npm run dev

# Gerar credenciais SMTP do Ethereal (alternativa sem instalação)
node -e "require('nodemailer').createTestAccount((e,a)=>console.log(a))"
```

---

## 9. Arquivos relevantes

- [backend/.env](backend/.env) — variáveis SMTP
- [backend/.env.example](backend/.env.example) — template
- [backend/src/config/env.ts](backend/src/config/env.ts) — schema Zod das envs
- [backend/src/modules/auth/infra/auth/services/nodemailer-email.service.ts](backend/src/modules/auth/infra/auth/services/nodemailer-email.service.ts) — serviço de envio
- [backend/src/modules/auth/infra/auth/controllers/forgot-password/](backend/src/modules/auth/infra/auth/controllers/forgot-password/) — endpoint de solicitação
- [backend/src/modules/auth/infra/auth/controllers/reset-password/](backend/src/modules/auth/infra/auth/controllers/reset-password/) — endpoint de redefinição
- [frontend/src/pages/ForgotPassword.tsx](frontend/src/pages/ForgotPassword.tsx) — tela "Esqueci minha senha"
- [frontend/src/pages/ResetPassword.tsx](frontend/src/pages/ResetPassword.tsx) — tela "Nova senha"
- [frontend/src/services/auth.ts](frontend/src/services/auth.ts) — cliente HTTP do auth
