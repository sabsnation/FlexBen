# Base funcional do projeto (flexível)

Este documento consolida a base do produto a partir de:

- requisitos funcionais e não funcionais já levantados;
- diagramas de escopo (classe, sequência e caso de uso);
- diretriz de benefícios flexíveis internos (sem troca P2P entre colegas).

## 1) Escopo funcional oficial

### Atores

- **Colaborador** — usa crédito flex, realoca, registra uso, consulta histórico.
- **Gestor** — aprova ou reprova solicitações em análise (SLA e fila).
- **Administrador (RH)** — categorias, usuários, carga mensal, políticas, painel executivo, auditoria.
- **Financeiro** — fechamento mensal, consolidação e exportação CSV.

### Funcionalidades por ator

**Colaborador**
- Autenticar e recuperar senha
- Consultar dashboard/saldo
- Realocar crédito entre categorias
- Registrar utilização de crédito
- Consultar histórico de transações
- Consultar categorias disponíveis

**Gestor**
- Dashboard e transações (consulta)
- Fila de aprovações com justificativa
- KPIs de SLA (pendências antigas, tempo médio)

**Financeiro**
- Dashboard de controle
- Fechamento mensal (liquidação)
- Exportação CSV
- Visão de risco por centro de custo (drill-down)

**Administrador (RH)**
- Todas as capacidades de colaborador, gestor e financeiro (conforme `capabilities.js`)
- Gerenciar categorias e limites
- Gerenciar usuários (convite com perfil)
- Processar carga mensal
- Painel executivo (previsto x realizado, políticas)
- Consultar auditoria (Firestore)
- Consultar base funcional (governança de requisitos)

## 2) Rastreabilidade RF/RNF

A matriz de requisitos foi materializada em código:

- `vue-app/src/config/projectScope.js`
  - `FUNCTIONAL_REQUIREMENTS` (RF01–RF10)
  - `NON_FUNCTIONAL_REQUIREMENTS`
  - `SYSTEM_MODULES`
  - `ROLE_CAPABILITIES`

## 3) Arquitetura em camadas (código)

### Frontend (Vue)

| Camada | Onde |
|--------|------|
| Apresentação | `views/`, `components/` |
| Controle | `router.js`, `App.vue` |
| Aplicação | `auth.js`, `transactions.js`, … |
| Domínio | `services/formValidators.js`, `services/transactionService.js` |
| Adapter (HTTP) | `adapters/HttpApiClient.js` |
| Repositório (API) | `repositories/*ApiRepository.js` |
| Configuração | `config/navigation.js`, `config/capabilities.js` |

### Backend (Node)

| Camada | Onde |
|--------|------|
| HTTP | `src/server.js` |
| Middleware | `src/middleware/auth.js` |
| Domínio | `src/lib/policyEngine.js` |
| Adapter (auditoria) | `src/adapters/audit/` |
| Persistência | Prisma + SQLite (`prisma/schema.prisma`) |

## 4) Fora do escopo atual

- Integração obrigatória com operadoras de voucher
- Repasse para terceiros
- Folha/tributação trabalhista
- OAuth2 / Kafka (documentados como evolução em `ANALISE-PROJETO.md`)

## 5) Próximas evoluções

- Modularizar rotas do `server.js`
- Auditoria versionada também em SQL (`audit_log`)
- CRUD de políticas na UI
- Health live/ready
- Testes automatizados
