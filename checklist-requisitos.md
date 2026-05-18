# Checklist de Regras de Negocio e Requisitos

Baseado no documento `Cópia de Escopo do projeto corporativo 2026 sabrina.pdf` (texto extraido em `escopo.txt`, quando disponivel no projeto).

**Plano detalhado da mudança (visão do sistema, API, requisitos revisados, ordem de implementação):** veja `PLANO-MUDANCA-FLEX-BENEFITS.md` na raiz do projeto.

## Posicionamento para o orientador — benefícios flexíveis internos

Use este resumo para alinhar o escopo com o que empresas de fato precisam gerir (sem marketplace de vouchers de parceiros).

**Problema que o orientador apontou:** benefícios ligados a **parcerias externas** (vale transporte, refeição via operadoras, etc.) costumam ser **contratuais e não transferíveis**; “trocar com colega” raramente faz sentido para o RH nesse contexto.

**Proposta de projeto (válida e corriqueira no mercado):** plataforma de **créditos flexíveis internos da empresa**. A empresa define um **orçamento mensal por colaborador** (ou regras equivalentes). O colaborador **distribui** esse crédito entre **categorias aprovadas pelo RH** (alimentação, saúde, educação, mobilidade). O sistema **registra movimentações e limites** por categoria. Não há integração obrigatória com operadoras; trata-se de **política e controle interno** (como em modelos de “flex benefits” corporativos).

**O que o sistema prova (acadêmico):** autenticação, perfis (colaborador / RH), regras de negócio, persistência, auditoria conceitual via histórico de transações e painel administrativo.

**O que ficaria explicitamente fora do escopo:** desconto em folha, repasse a terceiros, cumprimento de leis trabalhistas específicas de voucher — salvo como **trabalhos futuros**.

**Frase para fechar com o orientador:** *“O sistema não troca benefícios de parceiro; ele gerencia crédito flexível interno, categorias e movimentações sob controle do RH.”*

---

**Arquitetura no codigo (Vue):**

- **Controle:** `router.js` (guards), views e `App.vue` (navegacao).
- **Servico:** `vue-app/src/services/` (`authService`, `transactionService`, `formValidators`, `benefitFlow`).
- **Adapter HTTP:** `vue-app/src/adapters/HttpApiClient.js`
- **Repositorios API:** `vue-app/src/repositories/*ApiRepository.js`
- **Dominio:** `vue-app/src/services/` (validadores e calculos)

## 1) Regras de Negocio

- [x] O sistema deve permitir cadastro de usuario.
- [x] O sistema deve permitir autenticacao por login.
- [x] Apenas usuario autenticado pode consultar saldo.
- [x] Apenas usuario autenticado pode mover credito entre suas categorias (realocacao) ou registrar uso (saida).
- [x] Toda realocacao ou registro de uso gera transacoes auditaveis (SQLite/Prisma + evento opcional no Firestore).
- [x] ~~Transferencia P2P entre colaboradores~~ removida do produto (escopo flex interno).
- [x] As transacoes devem estar vinculadas ao usuario (`userEmail`).
- [x] Beneficios devem estar vinculados a categorias.
- [x] O fluxo deve respeitar camadas de controle, servico e persistencia.
- [x] O comportamento das operacoes deve seguir a sequencia definida (login, consulta, transferencia) — ver `services/benefitFlow.js` e rotas pos-login.

## 2) Requisitos Funcionais

- [x] RF01 - Cadastrar usuario.
- [x] RF02 - Realizar login.
- [x] RF03 - Consultar saldo de beneficios.
- [x] RF04 - Realocar credito flex entre categorias (mesmo colaborador) e registrar utilizacao (saida).
- [x] RF05 - Exibir historico de transacoes.
- [x] RF06 - Exibir categorias de beneficios (consulta para colaborador em `/consulta-categorias`; gestao admin em `/categorias`).
- [x] RF07 - Validar dados obrigatorios nos formularios (`formValidators.js` + validacoes nas views).

## 3) Requisitos Nao Funcionais (iniciais)

- [x] RNF01 - Interface simples e objetiva para operacoes principais.
- [x] RNF02 - Navegacao clara entre telas essenciais.
- [x] RNF03 - Estrutura preparada para evolucao da arquitetura (persistencia desacoplada).
- [x] RNF04 - Organizacao de codigo em camadas (coerente com modelagem).

## 4) Telas Iniciais (primeira entrega)

- [x] Tela de Login.
- [x] Tela de Cadastro.
- [x] Tela de Dashboard (saldo + resumo).
- [x] Tela de Realocacao de Creditos (`/realocar`).
- [x] Tela de Registrar utilizacao (`/utilizacao`).
- [x] Tela de Auditoria NoSQL para RH (`/auditoria`).
- [x] Tela de Historico de Transacoes.
- [x] Tela de Categorias de Beneficios (consulta + gestao admin).

## 5) Pendencias para refinamento com o documento completo

- [ ] Confirmar regras de validacao de transferencia (limites, tipos, horarios).
- [ ] Confirmar atores e permissoes detalhadas.
- [ ] Confirmar campos obrigatorios de cadastro.
- [ ] Confirmar estados completos da transacao no diagrama de estados.
- [ ] Confirmar requisitos de seguranca e auditoria.

## 6) Requisitos institucionais (4 modulos + integracao) — ver `PLANO-MUDANCA-FLEX-BENEFITS.md` secoes 14–17

**Divisao SQL vs NoSQL:** dados de dominio e movimentacao **sempre em PostgreSQL**; **Firestore** para eventos de auditoria (append-only), complementado por historico versionado em SQL quando o requisito exigir "valor antigo".

### Modulos obrigatorios

- [ ] **IAM:** OAuth2 / OpenID Connect com provedor (alem ou em lugar do JWT local apenas para demo).
- [x] **Core business (dominio):** categorias, saldo, realocacao, uso, carga mensal via API + Postgres *(auditoria versionada no SQL ainda pendente)*.
- [ ] **Comunicacao e eventos:** broker **Kafka ou RabbitMQ** para processamento assincrono (ex.: eventos pos-transacao).
- [ ] **Inteligencia de dados:** dashboard **executiva** (RH) com indicadores agregados *(dashboard do colaborador ja existe)*.

### Resiliencia e auditoria

- [x] Health check basico (`GET /api/health` com teste de banco).
- [ ] Health **live** / **ready** e detalhe por dependencia (DB, fila, Firestore opcional).
- [ ] **Circuit breaker** (ou isolamento) para falhas em servicos nao-criticos (ex.: auditoria Firestore).
- [ ] **Auditabilidade completa:** historico com quem criou/alterou, quando, **valor antigo** (tabela ou log no **Postgres** + eventos no Firestore se desejado).

### Interoperabilidade

- [ ] Expor/consumir servicos para legados ou parceiros via **protocolos padronizados** (ex.: REST + OpenAPI documentado; opcional fila para integracao).
