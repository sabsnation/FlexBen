# Plano consolidado — mudança para benefícios flexíveis internos

Documento único com visão do sistema **atual**, alinhamento com o **orientador**, **requisitos revisados** e **o que implementar** na sequência. Última revisão: maio/2026.

---

## 1. Visão geral do que já existe hoje

### 1.1 Stack

| Camada | Tecnologia | Pasta |
|--------|------------|--------|
| Frontend | Vue 3 + Vite + Vue Router | `vue-app/` |
| Backend | Node.js + Express + JWT + Prisma | `backend/` |
| Persistência transacional | **PostgreSQL** | Docker `docker-compose.yml`; `backend/prisma/` |
| Auditoria assíncrona (NoSQL) | **Firestore** (opcional) | `backend/src/lib/audit.js`; env `FIREBASE_SERVICE_ACCOUNT` |
| Cliente HTTP | `fetch` + proxy Vite `/api` → `127.0.0.1:3333` | `vue-app/src/api.js`, `vite.config.js` |

### 1.2 Rotas do frontend (autenticadas quando indicado)

| Rota | Nome | Público | Descrição |
|------|------|---------|-----------|
| `/login` | Login | Sim | Entrada JWT |
| `/cadastro` | Cadastro | Sim | Novo colaborador |
| `/recuperar-senha` | Recuperar Senha | Sim | Simulação |
| `/dashboard` | Dashboard | Auth | Resumo saldo / gráficos |
| `/realocar` | Realocar créditos | Auth | Entre categorias do **mesmo** colaborador |
| `/utilizacao` | Registrar utilização | Auth | Saída por categoria |
| `/transacoes` | Histórico | Auth | Lista / filtros / export CSV / exclusão |
| `/consulta-categorias` | Categorias (consulta) | Auth | Lista categorias ativas |
| `/categorias` | Gestão de Categorias | Admin | CRUD categorias |
| `/usuarios` | Gestão de Usuários | Admin | Status, exclusão |
| `/carga` | Carga Mensal | Admin | Créditos por colaborador × categoria |
| `/auditoria` | Auditoria (NoSQL) | Admin | Lista eventos Firestore `audit_events` |

### 1.3 API REST atual (resumo)

- `GET /api/health`
- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/recover`
- Usuários (admin): `GET /api/users`, `PATCH /api/users/:id/status`, `DELETE /api/users/:id`
- Categorias: `GET /api/categories`, `POST /api/categories` (admin), `DELETE /api/categories/:id` (admin)
- Transações: `GET /api/transactions`, `DELETE /api/transactions/:id`
- **Realocação / uso:** `POST /api/reallocations`, `POST /api/usage`
- **Carga mensal:** `POST /api/admin/monthly-load` (Entrada por colaborador ativo × cada categoria com valor = `limite`)
- **Auditoria admin:** `GET /api/admin/audit` (eventos Firestore, se configurado)

### 1.4 Módulos front importantes

- `vue-app/src/auth.js` — sessão + chamadas API de usuários (admin)
- `vue-app/src/transactions.js` — histórico, realocação, utilização, carga
- `vue-app/src/categories.js` — categorias
- `vue-app/src/services/` — validações e regras parciais (ex.: `transactionService.js`)

### 1.5 Observação crítica para a mudança

O comportamento de **“transferir benefício para outro colaborador”** (P2P) **não** combina com o posicionamento aprovado pelo orientador (crédito **interno**, sem marketplace de vouchers de parceiro). Essa parte deve ser **substituída ou removida** e o texto de requisitos/checklist **atualizado** para não contradizer a defesa.

---

## 2. Posicionamento acordado com o orientador

**Problema levantado:** benefícios atrelados a **parceiros/operadoras** são em geral **não transferíveis** entre pessoas; a empresa não “troca” vale refeição entre colaboradores como produto negociável.

**Solução de escopo para o TCC:** sistema de **benefícios flexíveis internos** — a empresa concede **crédito orçamentário** (política interna); o colaborador **consome ou realoca** dentro das **categorias definidas pelo RH**; o sistema **audita movimentos** e limites. **Sem** obrigação de integração com operadoras ou folha neste trabalho.

**Frase de fechamento:** *O sistema não troca benefício de parceiro; gerencia crédito flexível interno, categorias e movimentações sob controle do RH.*

---

## 3. Regras de negócio — estado do checklist vs novo domínio

Referência atual: `checklist-requisitos.md`.

| Regra antiga (checklist) | Situação após alinhamento |
|---------------------------|---------------------------|
| Cadastro e login | Mantém |
| Apenas autenticado consulta saldo | Mantém (saldo = somatório de entradas/saídas do colaborador nas categorias) |
| Transferência entre usuários | **Rever / substituir** (ver seção 6) |
| Toda transferência gera transação | **Reformular**: toda **movimentação relevante** gera registro |
| Transações vinculadas ao usuário | Mantém (`userEmail` ou `userId`) |
| Benefícios vinculados a categorias | Mantém |
| Camadas controle/serviço/persistência | Mantém conceito (front + API já separados) |
| Sequência login → consulta → operação | Mantém; a “operação” deixa de ser P2P por padrão |

---

## 4. Requisitos funcionais — proposta revisada (RF')

Substituir ou complementar os RF originais para refletir **flex interno**:

| ID | Descrição | Observação |
|----|-----------|------------|
| RF01 | Cadastrar usuário (colaborador) | Já existe |
| RF02 | Login / sessão | Já existe (JWT) |
| RF03 | Consultar **saldo e uso por categoria** | Dashboard + detalhamento |
| RF04' | **Realocar crédito entre categorias** OU **registrar utilização (saída)** | Em vez de P2P; ver seção 6 |
| RF05 | Histórico de movimentações | Já existe (`/transacoes`) |
| RF06 | Consultar categorias e limites | Consulta + gestão admin |
| RF07 | Validar formulários | Já existe (`formValidators`) |
| RF08 (novo, opcional) | RH define **orçamento flex total mensal** por colaborador | Hoje a “carga” credita por categoria; pode evoluir para “bolsa única” + alocação |

---

## 5. Revisão dos requisitos não funcionais (RNF)

Os RNF atuais (interface simples, navegação, camadas, evolução) **continuam válidos**.

**Requisitos “enterprise” mencionados anteriormente** (IAM OIDC, Kafka, circuit breaker, dashboard executiva corporativa):

| Tema | Recomendação para o TCC (1 mês) |
|------|----------------------------------|
| OAuth2 / OIDC | **Documentar** como trabalho futuro; manter JWT local para demo |
| Message broker | **Fora do escopo** da entrega; citar em “evolução” |
| Circuit breaker | **Fora** ou 1 parágrafo em arquitetura alvo |
| Health checks | Já existe `/api/health`; pode evoluir para `live`/`ready` |
| Auditoria completa (quem, quando, valor antigo) | **Parcial**: hoje há histórico de transações; evolução = tabela `audit_log` |
| Dashboard executivo | **Parcial**: painel RH atual + KPIs simples (contagens, volume por categoria) |

Isso evita conflito com prazo e com o foco do orientador.

> **Se o regulamento da disciplina exigir** IAM OIDC, broker, circuit breaker e dashboard executivo como **implementação** (não só texto), use a **matriz e o roadmap** nas **seções 14 a 17** abaixo como referência única; a tabela acima permanece como orientação de *priorização* quando o prazo for curto.

---

## 6. Decisão de produto obrigatória antes de codar muito

Escolher **uma** das linhas para substituir `POST /api/transfers` e a tela “Transferir”:

### Opção A — Realocação interna (recomendada para flex)

- Colaborador move valor **entre suas próprias categorias** (ex.: de “Mobilidade” para “Alimentação”), respeitando teto por categoria e saldo disponível.
- Uma operação gera **duas linhas lógicas** ou uma transação com tipo `Realocação` + metadados (implementação a definir).
- **Não** envolve segundo usuário.

### Opção B — Apenas registro de utilização (saída)

- Colaborador registra **gasto** ou **resgate interno** em uma categoria (descrição + valor).
- Sem movimento de crédito entre categorias na primeira versão.

### Opção C — Manter P2P só como “extra” desligado

- Remover da narrativa do TCC e do menu; manter código legado só se o orientador aceitar “cenário opcional”.

**Recomendação:** **Opção A** alinha melhor com “flex” e justifica dashboard e categorias.

---

## 7. Modelo de dados alvo (conceitual)

Hoje: `users`, `categories`, `transactions` em JSON.

Evolução mínima para flex (sem mudar tudo de uma vez):

| Entidade | Campos principais | Notas |
|----------|-------------------|--------|
| Usuário | id, nome, email, senha, role, status, datas | Já existe |
| Categoria | id, nome, limite (teto), status | `limite` = teto mensal da categoria para alocação/uso |
| Transação | id, userEmail, tipo (`Entrada` / `Saída` / futuro `Realocação`), categoria, valor, status, descricao, data | Ajustar `tipo` e regras conforme Opção A/B |
| (Futuro) Orçamento flex | userId, valorMensalTotal, competência | Para “bolsa única” antes de distribuir |

---

## 8. Plano de implementação sugerido (ordem)

1. **Texto e checklist** — Atualizar `checklist-requisitos.md`: remover ou marcar como legado RF04 P2P; incluir RF04' (realocação ou uso).
2. **Backend** — Substituir ou desativar `POST /api/transfers` por `POST /api/reallocations` (ou equivalente) com regra só para o próprio usuário; validar limites.
3. **Frontend** — Renomear rota/menu “Transferir” → “Realocar créditos” ou “Movimentar”; ajustar `TransferenciaView.vue` ou criar view nova.
4. **Carga mensal** — Renomear textos para “Crédito flex mensal” / “Provisionamento”; alinhar se a carga continua **por categoria** ou passa a ser **valor único** (decisão de produto).
5. **Dashboard** — Textos e métricas alinhados a “uso por categoria” e “saldo flex”, sem linguagem de “envio para colega”.
6. **Documentação do TCC** — Um diagrama de casos de uso (Colaborador / RH) + regras de negócio na linguagem do orientador.

---

## 9. Lista de arquivos impactados (para a mudança)

| Arquivo | Tipo de alteração esperada |
|---------|----------------------------|
| `checklist-requisitos.md` | Atualizar RN, RF, pendências |
| `backend/src/server.js` | Nova rota ou remoção de P2P; regras |
| `backend/src/data/db.json` | Dados de exemplo / tipos de transação |
| `vue-app/src/router.js` | Nomes de rotas e títulos |
| `vue-app/src/App.vue` | Labels do menu |
| `vue-app/src/views/TransferenciaView.vue` | Fluxo e cópia (ou substituição) |
| `vue-app/src/transactions.js` | Chamar novo endpoint |
| `vue-app/src/services/transactionService.js` | Regras de validação alinhadas |
| `vue-app/README.md` (se existir) | Descrição do produto | Opcional |

---

## 10. O que NÃO precisa mudar para defender o TCC

- Login, cadastro, recuperar senha (simulada).
- Gestão de usuários e categorias (RH).
- Histórico e exportação CSV.
- Separação front/back e JWT.
- Posicionamento: **flex interno**, não marketplace de parceiros.

---

## 11. Próximo passo imediato

1. Confirmar com você (e idealmente com o orientador) a **Opção A ou B** da seção 6.
2. Aplicar as alterações de código na ordem da seção 8.
3. Sincronizar `checklist-requisitos.md` com este plano para não haver contradição na entrega.

---

## 12. Referência cruzada

- Checklist e texto para o orientador: `checklist-requisitos.md` (início do arquivo).
- Este plano: `PLANO-MUDANCA-FLEX-BENEFITS.md` (raiz do projeto).

---

## 13. Infraestrutura implementada (PostgreSQL + Firestore)

### PostgreSQL

1. Na raiz do projeto: `docker compose up -d` (sobe PostgreSQL na porta 5432).
2. Copie `backend/.env.example` para `backend/.env` e ajuste `DATABASE_URL` se necessário.
3. No diretório `backend/`:
   - `npx prisma migrate deploy`
   - `npm run db:seed` (usuários demo; senha `123` com hash bcrypt)

### Firebase (NoSQL — auditoria)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com), ative **Firestore**.
2. Em Conta de serviço, gere JSON da chave.
3. No `backend/.env`, defina **uma linha** (escape de aspas conforme seu shell):
   - `FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'`
4. Endpoints: eventos gravados em `audit_events`; listagem em `GET /api/admin/audit` (admin).

Sem variável `FIREBASE_SERVICE_ACCOUNT`, a API funciona normalmente; a auditoria NoSQL fica desligada.

### API

- Rotas principais: `POST /api/reallocations` (realocação entre categorias do mesmo usuário), `POST /api/usage` (saída), `POST /api/admin/monthly-load` (créditos mensais).
- Autenticação: login com **bcrypt** no PostgreSQL (não usa mais `db.json`).

---

## 14. Divisão clara: o que fica em SQL (PostgreSQL) vs NoSQL (Firebase/Firestore)

Objetivo: **uma única fonte da verdade transacional** no Postgres; **eventos de auditoria / rastreio** complementares no Firestore, sem duplicar o modelo relacional inteiro no NoSQL.

| Responsabilidade | Onde guardar | Motivo |
|------------------|--------------|--------|
| Usuários, senhas (hash), papéis, status | **PostgreSQL** | Consistência, FK, consultas administrativas |
| Categorias e tetos (`limite`) | **PostgreSQL** | Regras de negócio e validação na mesma transação das movimentações |
| Transações (entrada/saída/realocação lógica) | **PostgreSQL** | ACID, saldo por categoria, histórico operacional |
| Relatórios, agregações de saldo, exportação | **PostgreSQL** | SQL agrega bem; é o núcleo do domínio |
| Log de **eventos de auditoria** (ação, ator, payload, timestamp) | **Firestore** (`audit_events`) | Stream append-only, desacoplado; falha do Firestore não deve impedir commit principal *(ver seção 15 — circuit breaker)* |
| Histórico estruturado “quem alterou, valor antigo/novo” em entidades | **PostgreSQL** *(recomendado: tabela `entity_audit` ou triggers)* | Requisito de auditabilidade forte: consulta única, joins com `users`, relatório para RH sem depender só do NoSQL |

**Regra prática:** tudo que participa de **saldo, limite e regra de negócio** é SQL. O NoSQL serve para **registro de eventos** (e, no futuro, projeções somente leitura), não como segunda cópia editável do mesmo dado.

---

## 15. Quatro módulos obrigatórios — mapeamento no código e lacunas

Referência: escopo institucional (IAM, núcleo de negócio, comunicação/eventos, inteligência de dados).

| Módulo | O que deve cobrir | O que o projeto tem hoje | Lacuna principal |
|--------|-------------------|---------------------------|------------------|
| **1. IAM (gestão de identidade)** | Provedor OIDC/OAuth2, tokens padronizados, perfis | Login **JWT local** + bcrypt no Postgres; papéis `colaborador` / `administrador` | Trocar ou **complementar** com **OpenID Connect** (ex.: Keycloak, Google Workspace, Entra ID): fluxo Authorization Code no front, API valida JWT do IdP |
| **2. Core business (domínio)** | Regras flex: categorias, realocação, uso, carga mensal | Express + Prisma + rotas de domínio | Completar **auditoria versionada no SQL** (antes/depois) e, se exigido, **sagas** disparadas após commit |
| **3. Comunicação e eventos (mensageria)** | Broker assíncrono (Kafka ou RabbitMQ): filas/tópicos para cargas, e-mails, auditoria assíncrona | Chamadas **síncronas** HTTP; `auditLog` Firestore na mesma request | Introduzir **um** broker: ex. RabbitMQ “fire-and-forget” para publicar `BenefitEvent` após transação; consumidor grava Firestore ou envia notificação |
| **4. Inteligência de dados (dashboard executivo)** | Indicadores para gestão: volume por categoria, ativos, tendência, uso vs teto | `DashboardView` focado no **colaborador**; admin tem lista/usuários/carga/auditoria | Tela **dashboard executivo (RH)** com KPIs agregados + endpoints `GET /api/admin/kpis` (ou materialized views / queries Prisma) |

---

## 16. Outros requisitos institucionais — matriz “bate ou não bate”

| Requisito | Situação atual | O que implementar (ordem sugerida) |
|-----------|----------------|-------------------------------------|
| **Health check** | `GET /api/health` testa Postgres e indica se Firestore está configurado | Evoluir: **`/api/health/live`** (processo vivo) e **`/api/health/ready`** (DB + opcional fila); retornar JSON com `dependencies[]` e status por componente |
| **Circuit breaker** | Não há; falha ao logar no Firestore só gera `console.warn` | Wrap opcional em `auditLog` / chamadas externas: após N falhas, **abrir circuito** por TTL e não bloquear request crítica; métricas simples em memória |
| **Auditabilidade completa** (quem, quando, valor antigo) | Transações = histórico de **movimentos**; Firestore = evento com **payload** genérico | **Postgres:** tabela de histórico (`entity_type`, `entity_id`, `action`, `actor_user_id`, `before_json`, `after_json`, `created_at`) ou expandir `audit_events` no SQL; Firestore continua como **réplica** ou somente eventos de alto nível |
| **OAuth2 / OpenID Connect** | Apenas JWT próprio | Adicionar rota `/api/auth/oidc/callback` ou usar lib no front; validação de token no back com JWKS do IdP |
| **Kafka ou RabbitMQ** | Ausente | Subir **RabbitMQ** no `docker-compose`; produtor após `commit` Prisma; consumidor para auditoria assíncrona (menor atrito que Kafka para TCC) |
| **Interoperabilidade** (legados/parceiros) | REST JSON sob `/api` | Documentar **OpenAPI 3**; endpoint “parceiro” com **API key** ou mTLS fictício; opcional consumo de webhook mock |

**Deploy:** fica **depois** de fechar IAM, health/readiness, auditoria SQL, mensageria mínima e dashboard executivo — conforme esta ordem.

---

## 17. Roadmap sugerido (telas + backend) antes de deploy

Ordem para reduzir retrabalho:

1. **Backend — auditoria forte no Postgres** (tabela + gravação nas mutações: usuário, categoria, transação relevante).
2. **Backend — health `live`/`ready` + circuit breaker leve** no `auditLog` / integrações.
3. **Infra — RabbitMQ** no compose + produtor em rotas críticas + consumidor que chama `auditLog` ou só loga (demo).
4. **Backend — `GET /api/admin/kpis`** (contagens, soma por categoria no mês, usuários ativos).
5. **Frontend — nova view `DashboardExecutivoView.vue`** (`/rh-dashboard` ou `/executivo`) só para admin, consumindo KPIs + link para auditoria.
6. **IAM OIDC** (último ou paralelo por ser mais intrusivo): escolher um IdP de demonstração e manter login local como fallback até integrar.

**Telas já existentes no router:** login, cadastro, dashboard colaborador, realocar, utilização, transações, consulta categorias, gestão categorias, usuários, carga mensal, auditoria Firestore. **Principal lacuna de tela:** **painel executivo (módulo 4)** para o perfil RH.

Atualize também o checklist em `checklist-requisitos.md` (seção 6 — requisitos institucionais) para acompanhar o fechamento destes itens.
