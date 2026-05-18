# Análise do projeto CorpBenefit Flex

Última revisão: maio/2026.

## 1. Resumo executivo

O produto **já cobre o escopo acadêmico principal** (benefícios flex internos, 4 perfis, políticas, workflow, fechamento, painel executivo). O que falta para “fechar” o TCC com qualidade é menos “telas novas” e mais **consistência documental**, **arquitetura em camadas** e **requisitos institucionais opcionais** (OAuth, fila, Postgres em produção).

| Área | Situação |
|------|----------|
| RF01–RF10 (funcional) | Implementados |
| Telas por perfil | Implementadas e refatoradas (UI 2026) |
| Motor de políticas + workflow | Backend (`policyEngine`, `WorkflowEvent`) |
| Auditoria NoSQL | Firestore opcional (Adapter) |
| Camadas front (Adapter + Repository) | Refatorado nesta entrega |
| Camadas back (monólito) | Parcial: middleware extraído; rotas ainda em `server.js` |
| Requisitos institucionais (OAuth, Kafka) | Documentados como evolução |
| Documentação vs código | Havia divergências (corrigidas em `BASE-FUNCIONALIDADES-FLEX.md`) |

---

## 2. O que cada camada faz hoje

### Frontend (`vue-app/`)

| Pasta | Papel (padrão) |
|-------|----------------|
| `views/` | **Apresentação** — telas Vue |
| `router.js` + `App.vue` | **Controle** — rotas e guards |
| `auth.js`, `transactions.js`, `categories.js`, `users.js` | **Aplicação** — estado e orquestração |
| `services/` | **Domínio** — regras puras (`formValidators`, `transactionService`, `benefitFlow`) |
| `adapters/HttpApiClient.js` | **Adapter** — transporte HTTP |
| `repositories/*ApiRepository.js` | **Adapter/Repository** — contrato de persistência via API |
| `config/` | **Configuração** — escopo, menu, capacidades |

### Backend (`backend/`)

| Pasta | Papel |
|-------|--------|
| `src/server.js` | **Entrega HTTP** — todas as rotas (monólito ~1.2k linhas) |
| `src/middleware/auth.js` | **Middleware** — JWT e perfis |
| `src/lib/policyEngine.js` | **Domínio** — regras de teto e aprovação |
| `src/lib/prisma.js` | **Infra** — ORM SQLite |
| `src/adapters/audit/` | **Adapter** — Firestore ou Noop |
| `src/lib/businessAudit.js` | **Facade** — eventos de negócio → auditoria |
| `prisma/` | **Persistência** — modelos SQL |

---

## 3. O que ainda falta (priorizado)

### Prioridade alta (recomendado antes da entrega)

1. **Documentação alinhada** — `BASE-FUNCIONALIDADES-FLEX.md` e `checklist-requisitos.md` citavam só colaborador/RH; o sistema tem gestor e financeiro.
2. **Um único processo de backend** — erro `EADDRINUSE :3333` = dois `npm run dev` ao mesmo tempo; usar `npm run dev` na raiz (sobe front + back).
3. **Testar Firebase** — login → Auditoria → evento em `audit_events`.
4. **Dividir `server.js`** em módulos de rota (`routes/auth.js`, `routes/transactions.js`, …) — melhora manutenção e TCC.

### Prioridade média (valor acadêmico)

5. **Tabela `audit_log` no SQLite** — histórico com valor antigo (requisito institucional), complementando Firestore.
6. **CRUD de políticas** na UI (hoje só leitura em `/rh/politicas`).
7. **Edição de categorias** (botão editar ainda não funcional).
8. **Health `live` / `ready`** com status de DB + Firestore.
9. **OpenAPI** (`swagger`) da API REST.

### Prioridade baixa / trabalho futuro

10. OAuth2 / OIDC (IAM institucional).
11. Kafka ou RabbitMQ (eventos assíncronos).
12. Circuit breaker explícito (hoje auditoria já falha sem derrubar a API).
13. Migração SQLite → PostgreSQL em produção.
14. Testes automatizados (Vitest + supertest).

---

## 4. Regras de negócio obrigatórias (checklist)

| Regra | Status |
|-------|--------|
| Cadastro e login | OK |
| Só autenticado consulta saldo / opera | OK |
| Realocação entre categorias (mesmo colaborador) | OK |
| Registro de utilização (saída) | OK |
| Sem P2P entre colaboradores | OK (removido) |
| Transações auditáveis | OK (SQL + Firestore opcional) |
| Política: teto por transação e mensal | OK (`enforcePolicy`) |
| Aprovação gerencial quando política exige | OK |
| Workflow: em análise → aprovado/reprovado → liquidado | OK |
| Carga mensal RH | OK |
| Fechamento financeiro | OK |
| Capacidades por perfil (`capabilities.js`) | OK |

---

## 5. Refatoração aplicada nesta entrega

### Padrão Adapter

- **Backend:** `FirestoreAuditAdapter` | `NoopAuditAdapter` + factory `createAuditAdapter()`.
- **Frontend:** `HttpApiClient` + repositórios `*ApiRepository` desacoplados do `fetch` direto nos composables.

### Limpeza

- Removidos `vue-app/src/persistence/*` (localStorage legado, não usado com API).
- Removido `services/authService.js` (lógica local obsoleta).

### Melhorias operacionais

- Mensagem clara em `EADDRINUSE` na porta 3333.
- Middleware de auth extraído para `middleware/auth.js`.

---

## 6. Como rodar sem conflito de porta

Na **raiz do projeto**:

```bash
npm run install:all
cd backend && npm run db:push && npm run db:seed
cd ..
npm run dev
```

Isso sobe backend (3333) e frontend (Vite) juntos. **Não** abra dois terminais com `npm run dev` só no backend.

Se a porta estiver ocupada:

```bash
kill $(lsof -t -i:3333) 2>/dev/null
```

---

## 7. Conclusão para o orientador

O sistema demonstra: **autenticação**, **perfis**, **regras de negócio**, **persistência relacional**, **auditoria NoSQL opcional**, **workflow corporativo** e **painéis por área (colaborador, gestor, RH, financeiro)**. Para a defesa, enfatize que o produto gerencia **crédito flex interno**, não voucher de parceiro.

Próximo passo técnico mais impactante: **modularizar o backend** + **audit_log em SQL** + **testes de fumaça** dos fluxos principais.
