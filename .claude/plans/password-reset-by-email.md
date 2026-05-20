# Plano — Reset de Senha por E-mail (YardProject)

## Contexto

A tela de Login hoje permite apenas autenticar e ir para "Criar conta", mas não há fluxo de recuperação para usuários que esqueceram a senha. Em produção isso é um bloqueio crítico: o suporte teria que resetar senhas manualmente no Mongo. O usuário pediu para adicionar um fluxo profissional de "Esqueci minha senha" que enviasse um link por e-mail.

O backend já tem toda a infraestrutura de auth (JWT, refresh rotation, sessions, bcrypt) seguindo DDD/Clean Arch + tsyringe + Fastify + Mongoose. **Não existe** módulo de e-mail (`nodemailer`, Resend, SES, nada). O frontend já tem Login/Register com RHF + zod e o componente Toast pronto.

Decisões confirmadas com o usuário:

- **Provedor:** Nodemailer + SMTP (dev: Mailtrap/Ethereal; prod: SMTP real). Sem lock-in.
- **UX:** link mágico no e-mail (`${FRONTEND_URL}/reset-password?token=xxx`).
- **Anti-enumeração:** `/forgot-password` retorna sempre 200 com mensagem genérica, mesmo se o e-mail não existir (OWASP).

A entrega segue o padrão DDD do módulo `auth` (espelhando `Session`), com testes unit + integration + e2e e validação manual via Mailtrap.

### Security Review aplicado (Security Engineer)

Plano original revisado contra OWASP Top 10, ASVS V2.5 (recovery), STRIDE. Achados aplicados ao plano:

- **F-01 (Crítico)** — Email injection via `user.name` não-escapado. Register Zod aceita `<script>`, CRLF. → `escapeHtml(name)` no template + subject estático.
- **F-02 (Alto)** — Token vaza via Referer/history/proxy. → `history.replaceState` no mount + `Referrer-Policy: no-referrer` + `Cache-Control: no-store`.
- **F-03 (Alto)** — Rate-limit só por IP é defeated por proxy rotation. → Per-email throttle (3/h/usuário) no use-case, com dummy bcrypt para anti-enumeração.
- **F-04 (Alto)** — Ordem `update(passwordHash) → revokeSessions` cria janela "senha nova + sessões antigas" em falha parcial. → Invertido: revoga sessões PRIMEIRO.
- **F-05 (Médio)** — Bcrypt no token é DoS amplifier. → Trocado para `HMAC-SHA-256(token, pepper)`.
- **F-06 (Médio)** — Formato `{ObjectId}.{plain}` vaza timestamp. → Token opaco; lookup por hash.
- **F-07 (Médio)** — Timing leak conhecido/desconhecido (250ms vs 5ms). → `bcrypt.compare` dummy no caminho silencioso.
- **F-08 (Médio)** — TTL sem upper bound. → Zod `.min(5).max(60)`.
- **F-09 (Médio)** — `logger.error(..., err)` serializa credenciais SMTP. → Log só `err.message`/`err.code`.

---

## Arquitetura — Backend

### Novo módulo: tokens de reset (parte do módulo `auth`)

Espelha o subsistema `Session` (entidade + repo abstract + mongo repo + in-memory test + factory + e2e).

#### Domain — `backend/src/modules/auth/domain/auth/`

| Arquivo | Responsabilidade |
|---|---|
| `entities/password-reset-token.ts` | Entidade `{ id?, userId, tokenHash, expiresAt, usedAt?, failedAttempts, requestedIp?, createdAt }` + métodos `create()`, `markUsed()`, `incrementFailedAttempts()`, `isUsed()`, `isExpired()`, `isConsumable()`. Campo `tokenHash` é SHA-256+pepper (não bcrypt — ver F-05). |
| `repositories/password-reset-token-repository.ts` | Abstract com `create`, `findByTokenHash(hash)` (lookup O(1) por índice único), `markUsed(id)`, `incrementFailedAttempts(id)`, `revokeAllUnusedForUser(userId)`, `countUnusedCreatedAfter(userId, since)` (para per-email throttle). Sem `deleteExpired` — TTL index do Mongo cuida. |
| `services/email-service.ts` | Abstract com método único `sendPasswordResetEmail({ to, name, resetUrl })`. Específico (não genérico `send()`) para não vazar template no use-case. **Contrato: implementações DEVEM escapar HTML em todos os campos dinâmicos antes da interpolação no template.** |
| `services/token-hash-service.ts` | Abstract com `hash(plainToken): string` (SHA-256+pepper, síncrono, sem I/O). Separa do `HashService` (bcrypt p/ senhas) — tokens aleatórios de 256 bits não se beneficiam de KDF lento e bcrypt vira DoS amplifier. |
| `languages/{en,es,pt}.ts` | Adicionar chaves: `auth.password-reset-requested`, `auth.password-reset-token-invalid`, `auth.password-reset-token-expired`, `auth.password-reset-token-used`, `auth.password-reset-success`, `auth.email-send-failed`. |

#### Application — `backend/src/modules/auth/application/auth/use-cases/`

**`request-password-reset/request-password-reset-use-case.ts`**

Request: `{ email, ip?, userAgent?, databaseOptions? }` → Response: `void`.

Injeta: `UserRepository`, `PasswordResetTokenRepository`, `TokenHashService` (SHA-256+pepper, ver §Infra), `EmailService`.

Fluxo:
1. Normaliza e-mail (`trim().toLowerCase()`).
2. `findByEmail` → se não achar, **executa `bcrypt.compare("dummy", env.DUMMY_BCRYPT_HASH)` para equalizar timing** com o caminho conhecido, e retorna silenciosamente (anti-enumeração — F-07 corrigido).
3. **Per-email throttle (F-03):** conta tokens criados pelo user na última 1h. Se ≥3, executa o mesmo dummy compare para equalizar timing e retorna void (não revoga tokens antigos, não envia email). Mantém body de resposta idêntico.
4. `revokeAllUnusedForUser(user.id)` — apenas 1 token ativo por usuário.
5. Gera `plainToken = crypto.randomBytes(32).toString("base64url")` (256 bits, 43 chars URL-safe).
6. `tokenHash = sha256(plainToken + env.RESET_TOKEN_PEPPER)` — SHA-256 com pepper (F-05: bcrypt é exagero para token aleatório de 256 bits e cria DoS amplifier).
7. `expiresAt = now + PASSWORD_RESET_TTL_MINUTES * 60_000` (default 30min, max 60).
8. Persiste entidade via `passwordResetTokenRepository.create()`.
9. URL opaca: `${env.FRONTEND_URL}/reset-password?token=${plainToken}` — lookup será via `findOne({ tokenHash })` no reset (F-06: sem ObjectId no URL → não vaza timestamp).
10. `try { emailService.sendPasswordResetEmail(...) } catch (err) { logger.error({ event: "auth.email-send-failed", message: err instanceof Error ? err.message : "unknown", code: (err as { code?: string })?.code }) }` — loga apenas `message` + `code`, nunca o objeto completo (F-09: evita vazar credenciais SMTP).
11. Return void.

**`reset-password/reset-password-use-case.ts`**

Request: `{ token, newPassword, databaseOptions? }` → Response: `void`.

Injeta: `UserRepository`, `PasswordResetTokenRepository`, `SessionRepository`, `HashService` (bcrypt p/ senha), `TokenHashService` (SHA-256 p/ token).

Fluxo:
1. Validar formato do token (base64url, 43 chars). Malformado → `UseCaseError("auth.password-reset-token-invalid", BAD_REQUEST)`.
2. `tokenHash = sha256(token + env.RESET_TOKEN_PEPPER)`.
3. `findByTokenHash(tokenHash)` → se null, invalid. **Lookup direto pelo hash com índice único** (sem composite, sem scan).
4. `isUsed()` → `auth.password-reset-token-used` (HTTP 410 Gone).
5. `isExpired()` → `auth.password-reset-token-expired` (HTTP 410 Gone).
6. Incrementa `failedAttempts` se hash mismatch (impossível com lookup-by-hash, mas defesa: se algum dia migrar para compare, ≥5 attempts marca como used).
7. `userRepository.findById(stored.userId)` → se null, invalid (não vaza "usuário deletado").

**Ordem crítica de mutação (F-04 — fail-safe):**

8. **`sessionRepository.revokeAllForUser(user.id)` PRIMEIRO** — se passos seguintes falharem, estado seguro é "todas sessões revogadas, senha intacta" (user re-solicita reset; recuperável). Nunca "senha nova + sessões antigas vivas".
9. `passwordHash = hashService.hash(newPassword)` (bcrypt cost 12) → `userRepository.update(user com novo hash)`.
10. `passwordResetTokenRepository.markUsed(id)` + `stored.markUsed()`.
11. Return void. Controller responde 204.

E2E spec deve mockar falha entre passos 8 e 9 e asseverar que sessões já foram revogadas (estado seguro garantido).

Zod schema no controller já valida senha (min 8 + letra + dígito). Use-case confia (mesma convenção do `LoginUseCase`).

Zod schema no controller já valida senha (min 8 + letra + dígito). Use-case confia (mesma convenção do `LoginUseCase`).

#### Infra — `backend/src/modules/auth/infra/auth/`

| Arquivo | Detalhe |
|---|---|
| `database/schemas/password-reset-token.schema.ts` | Coleção `password_reset_tokens`. Campos: `userId` (ObjectId, indexed, ref User), `tokenHash` (String, required, **unique index**), `expiresAt` (Date, `index: { expires: 0 }` → TTL purge), `usedAt` (Date, default null), `failedAttempts` (Number, default 0), `requestedIp` (String, default null). `timestamps: true`. Compound index `{ userId: 1, usedAt: 1, createdAt: -1 }` para `revokeAllUnusedForUser` + `countUnusedCreatedAfter` eficientes. |
| `database/mappers/mongo-password-reset-token-mapper.ts` | `toDomain` + `toPersistency`, espelha `mongo-session-mapper.ts`. |
| `database/repositories/mongo-password-reset-token-repository.ts` | `@injectable()` extends abstract. `findByTokenHash(hash)` = `findOne({ tokenHash: hash })`. `revokeAllUnusedForUser` = `updateMany({ userId, usedAt: null }, { $set: { usedAt: new Date() } })`. `countUnusedCreatedAfter(userId, since)` = `countDocuments({ userId, createdAt: { $gte: since } })`. |
| `services/sha256-token-hash.service.ts` | `@injectable()` extends `TokenHashService`. `hash(plain)` = `crypto.createHmac('sha256', env.RESET_TOKEN_PEPPER).update(plain).digest('hex')`. Síncrono, sem alloc além do esperado, constant-time vs input length (HMAC-SHA-256 garante). |
| `services/nodemailer-email.service.ts` | `@injectable()` extends `EmailService`. Construtor lê env uma vez; lazy `getTransporter()` cria `nodemailer.createTransport({ host, port, secure, auth: { user, pass } })`. `sendPasswordResetEmail` envia `from: env.SMTP_FROM` (estático, validado), subject estático "Redefinição de senha — YARD Logística" (sem interpolação de input do user). **Helper `escapeHtml(str)` aplicado em `name` antes de injetar no template `html`** — substitui `& < > " '` pelas entidades. Bloco `text` plain-text fallback (sem escape mas sem renderização). Nunca loga URL, credenciais, ou erros do transporter de forma serializada. |
| `controllers/forgot-password/forgot-password.controller.ts` + `.schema.ts` | Schema: `z.object({ email: z.email() }).strict()`. Controller resolve `RequestPasswordResetUseCase`, **sempre responde 200** com `{ success: true, message: t("auth.password-reset-requested") }`. Try/catch interno: qualquer erro vira 200 (anti-enumeração). |
| `controllers/reset-password/reset-password.controller.ts` + `.schema.ts` | Schema: `z.object({ token: z.string().min(10).max(256), password: z.string().min(8).max(128).regex(/[A-Za-z]/).regex(/[0-9]/) }).strict()`. Sucesso → 204. Erros sobem via `UseCaseError` handler existente. |

#### Rotas — editar `infra/auth/http/routes/auth.routes.ts`

```
POST /auth/forgot-password   → rate-limit 3/min/IP, público
POST /auth/reset-password    → rate-limit 5/min/IP, público
```

#### DI — editar `infra/auth/providers/auth.provider.ts`

```ts
container.registerSingleton<PasswordResetTokenRepository>(
  "PasswordResetTokenRepository", MongoPasswordResetTokenRepository
);
container.registerSingleton<TokenHashService>(
  "TokenHashService", Sha256TokenHashService
);
container.registerSingleton<EmailService>(
  "EmailService", NodemailerEmailService
);
```

Use-cases auto-resolvem via `@injectable()` + `container.resolve(...)` nos controllers (mesmo padrão do `LoginUseCase`).

### Config — `backend/src/config/env.ts`

Adicionar ao `envSchema`:

```
SMTP_HOST                     string (obrigatório em dev/prod, opcional em test)
SMTP_PORT                     number, default 587
SMTP_USER                     string (obrigatório em dev/prod)
SMTP_PASS                     string (obrigatório em dev/prod)
SMTP_FROM                     string, default 'YardControl <no-reply@yardcontrol.local>'
SMTP_SECURE                   boolean, default false
PASSWORD_RESET_TTL_MINUTES    z.coerce.number().int().min(5).max(60).default(30)   # F-08: bounded
RESET_TOKEN_PEPPER            z.string().min(32)                                    # F-05: HMAC pepper p/ SHA-256
DUMMY_BCRYPT_HASH             z.string().min(60)                                    # F-07: pré-computado p/ equalizar timing
```

Em `NODE_ENV === "test"` SMTP_* são opcionais (testes usam `FakeEmailService`). `RESET_TOKEN_PEPPER` e `DUMMY_BCRYPT_HASH` recebem defaults de teste hard-coded no `setupTests`.

`DUMMY_BCRYPT_HASH` deve ser pré-gerado uma vez via `bcrypt.hash("dummy-string-for-timing-equalization", 12)` e fixado no `.env` — assim o cost-12 compare em paths "unknown user" / "throttled" toma o mesmo tempo que paths legítimos.

Atualizar `backend/.env.example` com bloco comentado apontando para Mailtrap free tier em dev.

### Dependências — `backend/package.json`

Adicionar `nodemailer` + `@types/nodemailer`.

---

## Arquitetura — Frontend

### Schemas compartilhados — novo `frontend/src/validations/auth-schemas.ts`

Extrai e exporta:
- `emailSchema` (min 1 + email)
- `passwordSchema` (min 8 + regex letra + regex dígito, mensagens em PT)
- `confirmPasswordRefine(schema)` (helper para `password === confirmPassword`)

Refatora `Login.tsx` e `Register.tsx` para importar daqui. ROI pequeno mas garante consistência com `ResetPassword`.

### Service — editar `frontend/src/services/auth.ts`

Adicionar:

```ts
export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<unknown>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiRequest<unknown>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
```

### Nova página: `frontend/src/pages/ForgotPassword.tsx`

Reusa `./Login.css` (`auth-page`, `auth-card`, `form-banner`, etc.).

- Campo único: `email` (RHF + zod `emailSchema`).
- Submit: try/catch `forgotPassword(email)`.
- **Sucesso ou erro genérico (não-429):** troca o card para estado "Verifique seu e-mail" — ícone de inbox + texto: "Se este e-mail estiver cadastrado, enviaremos as instruções em instantes. Verifique sua caixa de entrada e a pasta de spam." + link "Voltar ao login".
- **429:** mantém form aberto, mostra banner "Muitas tentativas. Aguarde um momento."
- Footer: link "Voltar ao login" → `/login`.

### Nova página: `frontend/src/pages/ResetPassword.tsx`

Reusa `./Login.css`.

- `useSearchParams()` → `const token = params.get("token") ?? ""`.
- **`useEffect` no mount (F-02):** após capturar o token em state local, executa `window.history.replaceState({}, "", "/reset-password")` para remover o token do address bar, browser history e qualquer `document.referrer` futuro.
- Se `!token` → card de erro com "Link inválido ou ausente." + botão "Solicitar novo link" → `/forgot-password`.
- Form (RHF + zod): `password` (passwordSchema) + `confirmPassword` (confirmPasswordRefine).
- Submit: `resetPassword(token, password)`.
  - **Sucesso:** `toast.success("Senha atualizada com sucesso. Faça login com sua nova senha.")` + `navigate("/login", { replace: true })`.
  - **400 `auth.password-reset-token-invalid`:** banner "Link inválido." + CTA "Solicitar novo link".
  - **410 `auth.password-reset-token-expired`:** "Link expirado." + CTA.
  - **410 `auth.password-reset-token-used`:** "Este link já foi utilizado."
  - **429:** "Muitas tentativas. Aguarde um momento."
  - **default:** backend `message` ou texto genérico.

### Roteamento — editar `frontend/src/app/App.tsx`

- Estender `AUTH_ROUTES` com `/forgot-password` e `/reset-password` (esconde Header).
- Duas novas rotas públicas (fora de `<ProtectedRoute>`):
  - `<Route path="/forgot-password" element={<ForgotPassword />} />`
  - `<Route path="/reset-password" element={<ResetPassword />} />`

### Link no Login — editar `frontend/src/pages/Login.tsx`

Abaixo do campo senha (acima do submit), adicionar:

```tsx
<Link to="/forgot-password" className="auth-link--inline">
  Esqueci minha senha
</Link>
```

Em `Login.css`:

```css
.auth-link--inline {
  display: block;
  text-align: right;
  margin-top: 6px;
  font-size: 0.875rem;
}
```

---

## Testes — Backend

Padrão espelha `test/modules/auth/` existente (fakes + factories + InMemory repos + e2e via `buildTestApp`).

### Novos test doubles

- `test/modules/auth/infra/auth/services/fake-email.service.ts` — `public calls: Array<{ to, name, resetUrl }> = []`. `public shouldFail = false` (simula falha SMTP).
- `test/modules/auth/infra/auth/repositories/in-memory-password-reset-token-repository.ts` — espelha `in-memory-session-repository.ts`. `revokeAllUnusedForUser` itera `items` e stampa `usedAt`.
- `test/modules/auth/domain/auth/entities/make-password-reset-token.ts` — factory com defaults.

### Specs unitários

**`request-password-reset-use-case.spec.ts`:**
- Email desconhecido → resolve void; `fakeEmail.calls.length === 0`; `repo.items.length === 0`.
- Email conhecido → 1 token (hashed), email chamado 1× com URL no formato `^http://.+/reset-password\?token=[a-f0-9]{24}\.[a-f0-9]{64}$` e `name` correto.
- Duas requests consecutivas mesmo user → segunda revoga a primeira (`items[0].usedAt !== null`), 2 items, apenas o último consumable.
- `fakeEmail.shouldFail = true` → use-case ainda resolve void; token persistido.

**`reset-password-use-case.spec.ts`:**
- Token malformado → `auth.password-reset-token-invalid`.
- ID inexistente → invalid.
- `usedAt != null` → `auth.password-reset-token-used`.
- `expiresAt < now` (factory pré-envelhecida) → `auth.password-reset-token-expired`.
- Mismatch plaintext → invalid.
- Happy path: `passwordHash` atualizado, `usedAt` setado, `sessionRepo.revokeAllForUser` chamado 1× com userId correto, senha antiga não bate mais.

### Integration

`test/modules/auth/integration/mongo-password-reset-token-repository.integration.spec.ts`:
- `create + findById` round-trip.
- `markUsed` flipa `usedAt`.
- `revokeAllUnusedForUser` afeta só docs unused do user (outros users intactos).
- Asserção do TTL index: `db.collection.getIndexes()` tem `expiresAt_1` com `expireAfterSeconds: 0`.

### E2E

`test/modules/auth/e2e/password-reset.e2e.spec.ts`:

Setup como `login.e2e.spec.ts`. Override de `EmailService` por `FakeEmailService` via `container.registerSingleton(...)` em `buildTestApp` (adicionar param opcional `emailService?: EmailService` se ainda não existir hook similar).

Cenários:
1. `POST /api/auth/forgot-password` email desconhecido → 200, `fakeEmail.calls` vazio.
2. Email registrado → 200, exatamente 1 captured email.
3. Extrair `token` do `captured.resetUrl`; `POST /api/auth/reset-password` `{ token, password: "NewPass123" }` → 204.
4. Login senha antiga → 401. Senha nova → 200.
5. Reusar mesmo token → 410 `auth.password-reset-token-used`.
6. `/api/auth/me` com cookies obtidos antes do reset → 401 (sessions revogadas).
7. 4ª request a `/forgot-password` do mesmo IP em 1min → 429.
8. Token tampered/garbage → 400 `auth.password-reset-token-invalid`.
9. **Per-email throttle (F-03):** 4 reset requests pro mesmo email em 1h → 200 nas 4, mas `fakeEmail.calls.length === 3` (4ª foi silenciada).
10. **HTML escape (F-01):** registrar user com `name = "<script>alert(1)</script>"`; trigger reset; assert `captured.html` **não** contém `<script>` literal, apenas `&lt;script&gt;` ou `&amp;lt;script&amp;gt;`. Assert `captured.text` (plain fallback) também não vira HTML.
11. **Fail-safe ordering (F-04):** mockar falha de `userRepository.update` no use-case `reset-password`; assertar que `sessionRepository.revokeAllForUser` **já foi chamado** antes da falha (sessões ficam revogadas, senha intacta).
12. **Timing equalization (F-07):** medir `forgot-password` com email conhecido vs desconhecido com `performance.now()` em 10 amostras cada; delta médio < 50ms. (Tolerância larga porque CI tem jitter.)
13. **URL scrub no frontend:** teste de componente em `ResetPassword.test.tsx` — montar com `?token=xxx`, assertar que `window.history.replaceState` foi chamado com `("", "", "/reset-password")`.

---

## Segurança — checklist explícito (revisado pós-Security Review)

1. **Entropia do token:** 32 bytes (256 bits) via `crypto.randomBytes`, codificado em base64url (43 chars, URL-safe sem padding).
2. **At-rest hashing (F-05):** `HMAC-SHA-256(plainToken, RESET_TOKEN_PEPPER)` persistido em campo `tokenHash` com índice único. Bcrypt fica reservado a senhas — token aleatório de 256 bits não precisa de KDF lento, e bcrypt no path de reset vira DoS amplifier.
3. **URL do reset (F-06):** `?token=<opaque>` apenas — sem ObjectId embutido. Lookup direto via `findByTokenHash(sha256(token+pepper))`. Frontend chama `history.replaceState` no mount para limpar referrer/history.
4. **TTL bounded (F-08):** `PASSWORD_RESET_TTL_MINUTES` validado com `.min(5).max(60).default(30)` no Zod do env — impossível misconfig pra dias. Mongo TTL index auto-purga (`isExpired()` defende o gap de 60s entre expiry e purge).
5. **Único token ativo por usuário:** `revokeAllUnusedForUser` antes do `create`.
6. **No-replay:** `usedAt` setado no reset; `isUsed()` bloqueia reutilização. `failedAttempts ≥ 5` força used (defesa defense-in-depth, hoje impossível com lookup-by-hash, fica protegido para refactors futuros).
7. **Anti-enumeração (F-07 corrigido):**
   - `/forgot-password` sempre 200 com body idêntico.
   - **Caminho de "user desconhecido" executa `bcrypt.compare("dummy", env.DUMMY_BCRYPT_HASH)`** para equalizar timing com caminho conhecido (~250ms ambos). Sem deferral pra v2.
   - **Per-email throttle (F-03):** se ≥3 tokens criados em 1h pro mesmo user, retorna void (sem revogar, sem email) — mesmo dummy compare antes pra equalizar timing.
   - Rate-limit 3/min/IP é defesa externa adicional.
8. **Rate-limits:** `/forgot-password` 3/min/IP **+ 3/h/usuário** (per-email throttle no use-case); `/reset-password` 5/min/IP. Combinação derrota IP rotation.
9. **Session invalidation ordem-segura (F-04):** `revokeAllForUser` **antes** de atualizar `passwordHash`. Estado seguro de falha = "todas sessões revogadas, senha intacta" (recuperável via novo reset); jamais "senha nova + sessões antigas vivas".
10. **HTTPS em prod:** `FRONTEND_URL` deve ser `https://...` — documentado no `.env.example`.
11. **Logs (F-09):** SMTP errors logam apenas `err.message` + `err.code` (extraídos manualmente), nunca o objeto completo de erro do Nodemailer — que pode carregar `transporter.auth` na stack. Credenciais SMTP apenas via env, nunca em log.
12. **Email injection (F-01 — CRÍTICO):** template HTML aplica `escapeHtml(name)` antes de interpolar. Register schema **não** sanitiza HTML (`z.string().trim().min(1).max(120)` aceita `<script>`, CRLF). Subject é estático (sem interpolação de input). `from` vem só de `env.SMTP_FROM` validado. `to` vem só de `user.email` validado como email.
13. **CSRF:** endpoints não-autenticados, JSON body-only (não dependem de cookie), sem cookie-state mutável por origem terceira → sem mitigação extra.
14. **Referrer-Policy + Cache-Control:** rota `/reset-password` no frontend serve com `<meta name="referrer" content="no-referrer">` (ou header server-side se SSR); controller responde com `Cache-Control: no-store`.
15. **Audit fields:** `requestedIp` persistido na entidade `PasswordResetToken` para forense; nunca exposto no response.
16. **Tokens de teste:** `RESET_TOKEN_PEPPER` e `DUMMY_BCRYPT_HASH` recebem valores fixos em `setupTests` — não vazam em CI logs.

---

## Arquivos críticos

### Backend — novos (16)
1. `backend/src/modules/auth/domain/auth/entities/password-reset-token.ts`
2. `backend/src/modules/auth/domain/auth/repositories/password-reset-token-repository.ts`
3. `backend/src/modules/auth/domain/auth/services/email-service.ts`
4. `backend/src/modules/auth/domain/auth/services/token-hash-service.ts` *(novo — SHA-256+pepper)*
5. `backend/src/modules/auth/application/auth/use-cases/request-password-reset/request-password-reset-use-case.ts`
6. `backend/src/modules/auth/application/auth/use-cases/reset-password/reset-password-use-case.ts`
7. `backend/src/modules/auth/infra/auth/database/schemas/password-reset-token.schema.ts`
8. `backend/src/modules/auth/infra/auth/database/mappers/mongo-password-reset-token-mapper.ts`
9. `backend/src/modules/auth/infra/auth/database/repositories/mongo-password-reset-token-repository.ts`
10. `backend/src/modules/auth/infra/auth/services/nodemailer-email.service.ts`
11. `backend/src/modules/auth/infra/auth/services/sha256-token-hash.service.ts` *(novo)*
12. `backend/src/modules/auth/infra/auth/utils/escape-html.ts` *(helper para template — F-01)*
13. `backend/src/modules/auth/infra/auth/controllers/forgot-password/forgot-password.controller.ts`
14. `backend/src/modules/auth/infra/auth/controllers/forgot-password/forgot-password.schema.ts`
15. `backend/src/modules/auth/infra/auth/controllers/reset-password/reset-password.controller.ts`
16. `backend/src/modules/auth/infra/auth/controllers/reset-password/reset-password.schema.ts`

### Backend — editar (8)
14. `backend/src/config/env.ts` — adicionar SMTP + TTL.
15. `backend/.env.example` — bloco SMTP comentado.
16. `backend/src/modules/auth/domain/auth/languages/pt.ts`
17. `backend/src/modules/auth/domain/auth/languages/en.ts`
18. `backend/src/modules/auth/domain/auth/languages/es.ts`
19. `backend/src/modules/auth/infra/auth/providers/auth.provider.ts`
20. `backend/src/modules/auth/infra/auth/http/routes/auth.routes.ts`
21. `backend/package.json` — `nodemailer` + `@types/nodemailer`.

### Backend — testes novos (7)
22. `backend/test/modules/auth/infra/auth/services/fake-email.service.ts`
23. `backend/test/modules/auth/infra/auth/repositories/in-memory-password-reset-token-repository.ts`
24. `backend/test/modules/auth/domain/auth/entities/make-password-reset-token.ts`
25. `backend/test/modules/auth/application/auth/use-cases/request-password-reset/request-password-reset-use-case.spec.ts`
26. `backend/test/modules/auth/application/auth/use-cases/reset-password/reset-password-use-case.spec.ts`
27. `backend/test/modules/auth/integration/mongo-password-reset-token-repository.integration.spec.ts`
28. `backend/test/modules/auth/e2e/password-reset.e2e.spec.ts`

### Backend — testes possível edit (1)
29. `backend/test/helpers/build-test-app.ts` (se existir) — param opcional `emailService?: EmailService`.

### Frontend — novos (3)
30. `frontend/src/validations/auth-schemas.ts`
31. `frontend/src/pages/ForgotPassword.tsx`
32. `frontend/src/pages/ResetPassword.tsx`

### Frontend — editar (5)
33. `frontend/src/services/auth.ts` — adicionar `forgotPassword`, `resetPassword`.
34. `frontend/src/app/App.tsx` — rotas + `AUTH_ROUTES`.
35. `frontend/src/pages/Login.tsx` — link "Esqueci minha senha" + import dos schemas compartilhados.
36. `frontend/src/pages/Register.tsx` — import dos schemas compartilhados (refactor).
37. `frontend/src/pages/Login.css` — `.auth-link--inline`.

**Total: 26 novos + 14 editados.**

---

## Padrões reutilizados (não duplicar)

- **Use-case pattern:** `application/auth/use-cases/login/login-use-case.ts` (constructor injection, `@injectable`, `@inject` por token).
- **Controller + schema:** `infra/auth/controllers/register/*` (Zod via `zodValidationSchema`, `container.resolve`, presenter, HttpStatusCode).
- **Repository abstract + mongo impl:** `session-repository.ts` + `mongo-session-repository.ts`.
- **Mapper:** `mongo-session-mapper.ts`.
- **In-memory test repo + Fake service:** `in-memory-session-repository.ts` + `fake-hash.service.ts`.
- **Factory de teste:** `make-session.ts`.
- **Erros:** `UseCaseError("languageKey", HttpStatusCode.X)` + chaves em `domain/auth/languages/{en,es,pt}.ts`.
- **Frontend visual:** classes `auth-page`, `auth-card`, `form-field`, `form-input`, `form-banner--error`, `field-error`, `auth-submit`, `btn-spinner` já em `Login.css` — apenas consumir.
- **Frontend RHF:** padrão idêntico ao `Login.tsx` (`useForm({ resolver: zodResolver(schema) })`, `setError("root.serverError", ...)`, `isSubmitting`).
- **Toast:** `useToast().success(...)` (já em `components/Toast.tsx`).

---

## Orquestração (pipeline Agents Orchestrator)

Conforme `.claude/agents/agents-orchestrator.md`, executar com gates de qualidade:

1. **Backend Architect** — uma fase por vez, validação por EvidenceQA + `bun test:run`:
   1. Instalar deps (`nodemailer`, `@types/nodemailer`).
   2. Atualizar `env.ts` + `.env.example`.
   3. Adicionar chaves nos `languages/*`.
   4. Criar domain (entity, repo abstract, EmailService abstract).
   5. Criar infra Mongo (schema + mapper + repo) + integration spec.
   6. Criar `NodemailerEmailService`.
   7. Criar `RequestPasswordResetUseCase` + spec unit (com FakeEmailService + InMemoryRepo + factory).
   8. Criar `ResetPasswordUseCase` + spec unit.
   9. Criar controllers + schemas + registrar rotas em `auth.routes.ts`.
   10. Atualizar `auth.provider.ts` (bindings).
   11. Criar e2e spec.
   12. Gate: `bun test:run` (todos verdes) + `bun lint:check`.
2. **Frontend Developer:**
   1. Criar `validations/auth-schemas.ts` e refatorar Login/Register para usar.
   2. Adicionar `forgotPassword`/`resetPassword` em `services/auth.ts`.
   3. Criar `ForgotPassword.tsx` + adicionar rota em `App.tsx` + `AUTH_ROUTES`.
   4. Criar `ResetPassword.tsx` + adicionar rota.
   5. Adicionar link "Esqueci minha senha" em `Login.tsx` + `.auth-link--inline` em `Login.css`.
   6. Gate: `npx tsc -b && npx vite build` (sem erro).
3. **Security Engineer** — review final (checklist OWASP da seção "Segurança" acima).
4. **EvidenceQA** — smoke manual (seção "Verificação" abaixo).

---

## Verificação end-to-end

### Automatizado
```powershell
cd backend
bun install
bun test:run          # todos os 37 atuais + ~20 novos devem passar
bun lint:check

cd ../frontend
npm install
npx tsc -b
npx vite build
```

### Manual (Mailtrap)
1. Criar inbox no Mailtrap, copiar SMTP creds para `backend/.env`.
2. `cd backend && bun run dev`; `cd frontend && npm run dev`.
3. Registrar um usuário via `/register`.
4. Logout. Clicar "Esqueci minha senha" no `/login`.
5. Submeter email registrado → ver estado de sucesso.
6. Abrir inbox Mailtrap → clicar no link mágico.
7. Cair em `/reset-password?token=...`. Submeter nova senha (min 8 + letra + dígito).
8. Auto-redirect para `/login` com toast de sucesso. Tentar senha antiga → 401. Nova → 200.
9. Repetir passo 5 com email **desconhecido** → mesmo estado de sucesso. Confirmar **nenhum** novo email no Mailtrap.
10. Reusar mesmo link mágico → banner "Este link já foi utilizado".
11. Aguardar 31min após nova request, tentar link → "Link expirado".

### Curl
```bash
# Sempre 200
curl -i -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'

# Email desconhecido — também 200
curl -i -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"nobody@nowhere.com"}'

# Reset
curl -i -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<id>.<plain>","password":"NewPass123"}'

# Reuso → 410
curl -i -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<id>.<plain>","password":"NewPass123"}'

# Rate-limit smoke
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/forgot-password \
    -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'
done
# Esperado: 200, 200, 200, 429
```

### Verificação de segurança
- DevTools → Network: response do `/forgot-password` para email conhecido vs desconhecido tem **body idêntico**.
- Mongo Compass → coleção `password_reset_tokens`: apenas `hashedToken` (não o plaintext); `expiresAt` index presente com `expireAfterSeconds: 0`.
- Após reset com sucesso: outras sessões do user (segundo navegador logado) recebem 401 na próxima request.
- 6 tentativas de `/forgot-password` em 1min → 429 a partir da 4ª.
- Headers (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`) continuam aplicados.
