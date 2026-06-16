# Entrega 4 — IAM, Mensageria e Orquestração/Escalabilidade

**Disciplina / projeto:** FlexBen (benefícios flexíveis corporativos)  
**Data de entrega:** 12 de junho de 2026  
**Integrantes do grupo:** _(preencher: Nome 1, Nome 2, Nome 3, …)_

> **Como usar este arquivo:** siga o roteiro abaixo, execute os comandos, cole **prints legíveis** (terminal, Postman, RabbitMQ Management, Firestore) entre cada seção e exporte para **PDF** (Word/Google Docs → PDF) ou entregue este `.md` no repositório, conforme orientação do professor.

---

## Visão do que o FlexBen já implementa

| Requisito da entrega | Tecnologia no FlexBen |
|----------------------|------------------------|
| IAM (autenticação + autorização) | JWT (`authRequired`) + papéis (`roleRequired`, `adminRequired`) + capabilities no front |
| Mensageria | **RabbitMQ** (fila `flexben.notifications`) ou modo **inline** sem broker |
| Orquestração | **Docker Compose** (Postgres, RabbitMQ, Mongo opcional) + deploy **Render/Vercel** |
| Logs de auditoria (complemento IAM) | Firestore / Mongo (`LOGIN`, `LOGIN_GOOGLE`, etc.) |

---

## 1. Evidências de IAM (Autenticação e Autorização)

### 1.1 O que você precisa provar

1. **Sucesso:** usuário autenticado acessa rota permitida (HTTP **200** + log).
2. **Bloqueio:** usuário **sem token** ou **perfil errado** recebe **401** ou **403** + log.

### 1.2 Preparação (uma vez)

```bash
# Na raiz do repositório
docker compose up -d postgres rabbitmq   # opcional para mensageria; IAM só precisa da API
cd backend && npm run dev                # ou: npm run dev na raiz do monorepo
```

API local: `http://127.0.0.1:3333`

### 1.3 Evidência A — Autorização com sucesso (200)

**Descrição (1–2 linhas para colar no PDF):**  
Colaborador autenticado com JWT válido consulta `GET /api/transactions`, rota protegida por `authRequired` e papel permitido; o middleware valida o token e a API responde 200.

**Comandos (terminal):**

```bash
# Login (conta demo — senha 123)
curl -s -X POST http://127.0.0.1:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@empresa.com","senha":"123"}' | tee /tmp/flexben-login.json

# Copiar o token (ajuste se usar jq)
TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/flexben-login.json','utf8')).token)")

# Rota permitida para colaborador
curl -s -o /tmp/tx.json -w "\nHTTP %{http_code}\n" \
  http://127.0.0.1:3333/api/transactions \
  -H "Authorization: Bearer $TOKEN"
```

**O que capturar (print):**

- Saída do `curl` com **`HTTP 200`** e corpo JSON com `transactions`.
- **Log do terminal do backend** (morgan), linha parecida com:  
  `GET /api/transactions 200 …`

**Alternativa (UI):** login como `joao.silva@empresa.com` / `123` → abrir **Transações** → print da tela + aba Network (status 200 em `/api/transactions`).

### 1.4 Evidência B — IAM negando acesso (401 sem token)

**Descrição:**  
Requisição sem header `Authorization` à rota protegida; `authRequired` retorna **401** com mensagem `Token ausente.`

```bash
curl -s -w "\nHTTP %{http_code}\n" http://127.0.0.1:3333/api/transactions
```

**Print:** corpo `{"message":"Token ausente."}` + **HTTP 401** + log morgan `GET /api/transactions 401`.

### 1.5 Evidência C — IAM negando por perfil (403)

**Descrição:**  
Colaborador autenticado tenta acessar rota exclusiva de RH/Admin; `roleRequired(['administrador'])` retorna **403**.

```bash
# Token do colaborador (já obtido acima com joao.silva@empresa.com)
curl -s -w "\nHTTP %{http_code}\n" \
  http://127.0.0.1:3333/api/users \
  -H "Authorization: Bearer $TOKEN"
```

**Print:** `{"message":"Acesso negado para o perfil informado."}` (ou equivalente) + **HTTP 403**.

**Comparação (opcional, mesma rota com admin):**

```bash
curl -s -X POST http://127.0.0.1:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sabrina.admin@empresa.com","senha":"123"}' | tee /tmp/admin-login.json

ADMIN_TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/admin-login.json','utf8')).token)")

curl -s -w "\nHTTP %{http_code}\n" \
  http://127.0.0.1:3333/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Print:** admin com **HTTP 200** lado a lado com colaborador **403** (duas janelas ou tabela no PDF).

### 1.6 Evidência D (complementar) — Trilha de login na auditoria

**Descrição:**  
Eventos `LOGIN` / `LOGIN_GOOGLE` registrados no log de auditoria (Firestore), provando autenticação rastreável.

**Passos:** login no app como admin → **Auditoria** → filtro **Logins** → print da lista com ação e e-mail do ator.

**Código de referência:** `backend/src/middleware/auth.js`, rotas com `authRequired` / `roleRequired` em `backend/src/server.js`.

---

## 2. Evidências de Mensageria (RabbitMQ)

### 2.1 O que você precisa provar

1. Mensagem **publicada** (producer) após um evento de negócio.
2. Mesma mensagem **consumida e processada** (consumer) pelo worker da API.

### 2.2 Preparação

```bash
docker compose up -d rabbitmq
```

No `backend/.env` (criar ou ajustar):

```env
RABBITMQ_URL="amqp://flexben:flexben@localhost:5672"
```

Reinicie a API. No boot deve aparecer:

```text
[messaging] RabbitMQ habilitado
[rabbitmq] consumindo fila "flexben.notifications"
```

Painel RabbitMQ: **http://localhost:15672** — usuário `flexben` / senha `flexben`.

### 2.3 Evidência A — Producer (publicação)

**Descrição:**  
Ao registrar uma utilização (ou outra operação que dispara notificação), a API publica evento na fila `flexben.notifications`.

**Passo prático:** com API + RabbitMQ rodando, faça login como colaborador e registre uma **utilização** em `/utilizacao` (ou realocação que exija aprovação).

**Print do terminal da API** (após a ação):

```text
[rabbitmq] publicado na fila "flexben.notifications": usage.submitted
```

_(Se não aparecer, confira `RABBITMQ_URL` e reinicie o backend.)_

### 2.4 Evidência B — Consumer (processamento)

**Descrição:**  
O consumer da mesma API processa a mensagem da fila e persiste notificação (gestor vê no sino).

**Print do terminal da API:**

```text
[rabbitmq] mensagem consumida e processada: usage.submitted
```

**Print do RabbitMQ Management:**

- Aba **Queues** → fila `flexben.notifications`.
- Gráfico ou contadores mostrando mensagem **publicada** e **ack** (Ready ≈ 0 após processar).

### 2.5 Evidência C — Fluxo ponta a ponta (recomendado no PDF)

Monte **3 prints em sequência** com legendas:

1. Tela da operação (utilização enviada).  
2. Log `publicado na fila`.  
3. Log `consumida e processada` + fila no painel 15672.

**Código de referência:**  
`backend/src/adapters/messaging/RabbitMqBroker.js`,  
`backend/src/lib/notificationPublisher.js`,  
`docker-compose.yml` (serviço `rabbitmq`).

### 2.6 Modo inline (não usar na entrega 4 de mensageria)

Sem `RABBITMQ_URL`, o log mostra `[messaging] modo inline` — **não conta** como broker. Para esta entrega, **obrigue RabbitMQ**.

---

## 3. Evidências de Orquestração e Escalabilidade

### 3.1 O que você precisa provar

Ambiente **orquestrado** (vários containers/serviços coordenados) e **preparado para escalar** (réplicas, healthchecks ou política de scaling documentada).

O FlexBen usa **Docker Compose** (não há cluster Kubernetes no repositório; compose é aceito pelo enunciado).

### 3.2 Evidência A — Serviços orquestrados (Compose)

**Descrição:**  
Postgres, RabbitMQ e (opcional) Mongo sobem juntos com healthchecks e rede isolada do Compose.

```bash
docker compose up -d postgres rabbitmq
docker compose --profile audit up -d mongo   # opcional — auditoria Mongo local
docker compose ps
```

**Print:** saída de `docker compose ps` com containers **Up (healthy)** — `flexben-pg`, `flexben-rabbitmq`, etc.

**Print (opcional):** trecho do arquivo `docker-compose.yml` mostrando `healthcheck`, `restart: unless-stopped` e portas mapeadas.

### 3.3 Evidência B — Prontidão para escalar (horizontal)

**Descrição:**  
A API é **stateless** (JWT + Postgres); o broker desacopla notificações; múltiplas instâncias da API podem consumir a mesma fila. Em produção, o blueprint **Render** permite aumentar instâncias do serviço web.

**O que incluir no PDF (sem precisar de Kubernetes):**

1. Print de `docker compose ps` (serviços de infraestrutura).  
2. Parágrafo: *“A API pode ser replicada N vezes atrás de um load balancer; sessão no JWT; fila RabbitMQ distribui carga de eventos.”*  
3. Print ou recorte de `render.yaml` (serviço `flexben-api`) mencionando deploy gerenciado na nuvem.

**Se o professor exigir réplicas explícitas:** na apresentação oral, cite `docker compose up --scale` apenas para serviços **stateless** que vocês adicionarem no futuro; hoje a evidência válida é **multi-container de infraestrutura + API stateless + fila**.

### 3.4 Evidência C (opcional) — Health da API

```bash
curl -s http://127.0.0.1:3333/api/health | jq .
```

**Print:** JSON com `messaging.provider: "rabbitmq"` (com broker ligado) e status OK.

---

## 4. Checklist antes de enviar

| Item | OK |
|------|----|
| Nomes de **todos** os integrantes no topo do PDF | ☐ |
| **3 blocos** (IAM, Mensageria, Orquestração), cada um com **1–2 linhas** explicando o print | ☐ |
| Pelo menos **1 print 401/403** e **1 print 200** autenticado | ☐ |
| RabbitMQ com **publicar + consumir** visível (log ou painel 15672) | ☐ |
| `docker compose ps` legível com serviços **healthy** | ☐ |
| Imagens em resolução suficiente (zoom 100% no PDF) | ☐ |
| Formato final: **PDF** ou **Markdown** conforme combinado com o professor | ☐ |

---

## 5. Roteiro rápido (≈ 30 minutos)

1. `docker compose up -d postgres rabbitmq`  
2. `RABBITMQ_URL` no `backend/.env` → subir API → print logs de boot RabbitMQ  
3. Executar curls da seção 1 (401, 403, 200) → prints terminal + morgan  
4. Login no app → utilização → prints logs publicar/consumir + fila 15672  
5. `docker compose ps` → print  
6. Montar PDF com nomes do grupo e legendas em cada figura  

---

## 6. Referências no repositório

- IAM: `backend/src/middleware/auth.js`  
- Mensageria: `backend/src/adapters/messaging/`, `backend/src/lib/notificationPublisher.js`  
- Compose: `docker-compose.yml`  
- Deploy: `render.yaml`, `DEPLOY.md` (§ mensageria)  
- Contas demo: `AGENTS.md` (senha `123`)

---

_Documento gerado para apoio à Entrega 4 — FlexBen TCC._
