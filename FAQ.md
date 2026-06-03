# FlexBen — Perguntas frequentes (FAQ)

Documento de referência sobre o sistema **FlexBen** (benefícios flexíveis corporativos). Não faz parte da interface do produto; destina-se a usuários, gestores, RH, financeiro, desenvolvedores e avaliadores do TCC.

**Última atualização:** junho/2026

---

## Índice

1. [Sobre o produto](#1-sobre-o-produto)
2. [Perfis e permissões](#2-perfis-e-permissões)
3. [Login, cadastro e conta](#3-login-cadastro-e-conta)
4. [Categorias e créditos](#4-categorias-e-créditos)
5. [Realocação e utilização](#5-realocação-e-utilização)
6. [Aprovações e workflow](#6-aprovações-e-workflow)
7. [RH, políticas e carga](#7-rh-políticas-e-carga)
8. [Financeiro e fechamento](#8-financeiro-e-fechamento)
9. [Notificações e auditoria](#9-notificações-e-auditoria)
10. [Interface e experiência](#10-interface-e-experiência)
11. [Técnico, API e dados](#11-técnico-api-e-dados)
12. [Deploy, ambiente e suporte](#12-deploy-ambiente-e-suporte)

---

## 1. Sobre o produto

### O que é o FlexBen?

Plataforma corporativa para gestão de **benefícios flexíveis internos**: créditos por categoria (alimentação, mobilidade, saúde, etc.), com realocação, utilização, aprovações, governança de RH e fechamento financeiro.

### Para que tipo de empresa o FlexBen serve?

Organizações que distribuem benefícios em **bolsos/categorias** e precisam de controle, limites, aprovação gerencial e rastreio auditável — típico de programas flex corporativos e projetos acadêmicos de gestão de benefícios.

### O FlexBen substitui folha de pagamento ou ERP?

Não. É um sistema **complementar** focado em créditos flex internos, políticas por categoria e fluxo de aprovação — não processa salários nem contabilidade completa.

### Qual a diferença entre “realocar” e “utilizar”?

**Realocar** move saldo de uma categoria para outra. **Utilizar** registra um **gasto/saída** de crédito na categoria (consumo do benefício).

### O sistema é apenas demonstração (TCC)?

Foi desenvolvido como **TCC** com stack de produção (Render + Vercel), mas inclui fluxos completos, contas demo e deploy real — não é só protótipo estático.

### Em que idioma está a interface?

Português (PT-BR). Código-fonte (variáveis, rotas) em inglês.

### Onde acesso o sistema em produção?

Frontend na **Vercel** (URL do deploy do projeto) e API em **`https://flexben.onrender.com`**. O front encaminha `/api` para o backend.

---

## 2. Perfis e permissões

### Quais perfis existem?

| Perfil | Papel resumido |
|--------|----------------|
| **Colaborador** | Usa créditos, realoca, registra utilização |
| **Gestor** | Aprova/reprova operações na fila |
| **RH / Administrador** | Categorias, usuários, políticas, carga, auditoria |
| **Financeiro** | Alocação, tetos, fechamento mensal |

### Um usuário pode ter mais de um perfil?

Não. Cada conta tem **um** `role` fixo definido no cadastro.

### Por que não consigo acessar uma tela?

O **router** e as **capabilities** restringem rotas por perfil. Mensagem típica: “Acesso negado para o seu perfil.”

### O que é “capability” no código?

Regra declarativa em `capabilities.js` que define o que cada perfil pode fazer (ex.: alocar crédito, ver auditoria), usada em conjunto com o perfil (`role`).

### Gestor vê transações de toda a empresa?

O gestor foca na **fila de aprovações** e operações submetidas; o escopo detalhado de listagens depende da rota (aprovações, SLA, etc.).

### Colaborador pode ver categorias inativas?

Em geral consulta categorias **ativas** para operar; telas de gestão de categorias são do administrador.

---

## 3. Login, cadastro e conta

### Como obtenho acesso ao sistema?

Cadastro público está **desativado**. Solicite ao **RH ou administrador**, que cria a conta em **Usuários**.

### Quais formas de login existem?

1. **E-mail e senha** (conta “demo/senha” criada pelo admin).  
2. **Google** (conta criada pelo admin com tipo “Google”; login só pelo botão Google).

### Esqueci minha senha. O que fazer?

Use **Recuperar senha** na tela de login (fluxo informativo; em demo pode não enviar e-mail real). Contas **Google** não usam senha no FlexBen.

### Por que o login com Google retorna erro?

Causas comuns: e-mail **não cadastrado**; conta cadastrada como **senha** e não Google; `GOOGLE_CLIENT_ID` ausente no Render; origem (`localhost` ou URL Vercel) **não autorizada** no Google Cloud.

### O que significa `googleAuth: false` no `/api/health`?

A API de produção **não** tem a variável `GOOGLE_CLIENT_ID` configurada — login Google não funcionará até configurar.

### Posso trocar minha senha no app?

Sim, em **Meu perfil**, se a conta for `authProvider: password`. Contas Google não alteram senha aqui.

### O que é armazenado no navegador após o login?

Token JWT (`auth_token`) e dados básicos do usuário (sem avatar pesado no `localStorage`).

### A sessão expira?

Sim. JWT com validade limitada (ex.: 12 horas). Após expirar, é necessário login novamente.

### Contas de demonstração existem?

Sim. Na tela de login há atalhos; senha padrão **`123`** (ver `README.md` e `seed.js`).

---

## 4. Categorias e créditos

### O que é uma “categoria”?

Bolso de benefício (ex.: Alimentação) com **limite/teto** e status Ativa/Inativa.

### Quem cria categorias?

**Administrador (RH)** em **Categorias**.

### O que é “limite” de categoria?

Valor máximo de referência da categoria (política/teto); usado nas regras de negócio e exibição — não confundir com saldo individual sem carga.

### Como o colaborador recebe crédito?

Via **carga mensal** (RH) ou **alocação** (financeiro), conforme processo da empresa no sistema.

### Por que meu saldo aparece zerado?

Possíveis causas: sem **carga/alocação** no período; categorias inativas; filtro de escopo; necessidade de atualizar o dashboard.

### Posso ter saldo em várias categorias ao mesmo tempo?

Sim. Cada categoria tem saldo **independente** (derivado de transações).

---

## 5. Realocação e utilização

### Como realoco crédito entre categorias?

Menu **Realocar** → origem, destino, valor (máscara em R$) → confirmar. Respeita saldo e políticas.

### A realocação é imediata?

Pode ser **imediata** (Concluída) ou ir para **Em análise** se exigir aprovação (ex.: operação iniciada pelo financeiro ou política).

### Por que não vejo uma categoria nova no destino da realocação?

Atualize a tela ou saia e entre de novo; categorias recém-criadas devem aparecer após recarregar saldos/categorias.

### O que é “utilização”?

Registro de **saída** de crédito (gasto) em uma categoria — em geral só **colaborador**.

### Qual valor mínimo/máximo posso realocar?

Depende de **saldo disponível** na origem e das **regras de política** (`policyEngine`) para seu perfil e categoria.

### Realocação gera duas transações?

Sim, em geral um par **débito** na origem e **crédito** no destino, vinculados no workflow.

---

## 6. Aprovações e workflow

### Quem aprova realocações e alocações?

O **gestor** (e em alguns fluxos o administrador) na tela **Aprovações**.

### O que significa status “Em análise”?

Aguardando decisão do gestor (aprovar/reprovar). Pode aplicar a pares de transação vinculadas.

### O gestor reprova uma operação. O que acontece?

Status passa a **Reprovada**; saldos e histórico refletem a decisão conforme regras do backend.

### O que é SLA na fila do gestor?

Indicador de tempo/agrupamento de pendências (ex.: limiar em dias) para priorizar aprovações antigas.

### Financeiro precisa de aprovação ao alocar crédito?

Sim, em fluxos configurados: alocação pelo financeiro pode ficar **Em análise** até o gestor decidir.

### Posso cancelar uma solicitação pendente?

Depende do fluxo implementado; em geral decisão é **aprovar** ou **reprovar** pelo gestor. Verifique na tela de transações.

---

## 7. RH, políticas e carga

### O que o RH faz no FlexBen?

Gerencia **políticas**, **categorias**, **usuários**, **carga mensal de créditos** e consulta **auditoria**.

### O que são “políticas”?

Regras por **perfil + categoria + centro de custo**: tetos por transação, teto mensal, exigência de aprovação.

### Como convido um novo colaborador?

**Usuários → Convidar** → nome, e-mail, perfil, tipo **Demo/senha** ou **Google**.

### Qual e-mail usar para conta Google?

O **mesmo e-mail** da conta Google do colaborador; caso contrário o login Google falha com “não cadastrado”.

### O que é carga mensal?

Processo do RH para **creditar** colaboradores em lote (preview + execução), conforme categorias ativas.

### Posso inativar um usuário sem excluir?

Sim. **Inativar** impede login; histórico permanece. **Excluir** remove o registro (irreversível).

### Onde vejo o log de auditoria?

**Auditoria** (admin), integrado a Firestore/Mongo conforme ambiente.

---

## 8. Financeiro e fechamento

### O que o financeiro faz?

**Fechamento** mensal, **alocação** de créditos, **propostas de teto** e visão consolidada previsto × realizado.

### O que é fechamento?

Consolidação de um **período** (mês/ano) com totais e exportação (CSV, Excel, PDF conforme tela).

### Posso exportar relatórios?

Sim, na área de fechamento e em listagens que oferecem exportação CSV.

### O que é proposta de teto de benefício?

Solicitação de alteração de limite de categoria; pode exigir **aprovação do gestor** antes de aplicar.

### Alocação para um colaborador específico é possível?

Sim, via fluxo de **alocação de crédito** (financeiro), com validação de perfil e políticas.

---

## 9. Notificações e auditoria

### Como funcionam as notificações?

Registros na base **PostgreSQL** por usuário; painel no ícone de sino; contagem de não lidas.

### Preciso de RabbitMQ?

Não. Sem `RABBITMQ_URL`, eventos são processados **inline** na API. Com RabbitMQ, usa fila `flexben.notifications`.

### O que vai para auditoria?

Eventos de negócio: login, criação de usuário, transações, decisões de workflow, fechamento, etc. — append-only no adapter configurado.

### Firestore ou MongoDB para auditoria?

Configurável (`AUDIT_PROVIDER` ou auto-detecção por credenciais). Sem credencial, pode usar **noop** (sem persistência externa).

### As notificações chegam por e-mail?

Não no escopo padrão atual; são **in-app** (sino).

---

## 10. Interface e experiência

### O sistema funciona no celular?

Layout **responsivo** com menu lateral recolhível em telas menores (breakpoint ~1024px).

### Onde altero foto e nome?

**Meu perfil** (avatar no header). Foto é comprimida antes do envio.

### Por que apareceu “Token ausente” ao sair?

Era um bug de chamada API após logout; corrigido para não exibir toast nesse caso.

### Por que “Resposta vazia da API” ao excluir usuário?

O backend retorna **204 sem corpo**; o cliente HTTP foi ajustado para tratar isso como sucesso.

### Onde está o botão Sair?

No **header**, ao lado do perfil (ícone quadrado), não mais no rodapé da sidebar.

### Formato de valores monetários?

Padrão **pt-BR** (ex.: `1.234,56`) nos campos com `MoneyInput`.

---

## 11. Técnico, API e dados

### Qual a stack do backend?

Node.js 20+, Express, Prisma, PostgreSQL (prod.) / SQLite (dev.).

### Qual a stack do frontend?

Vue 3, Vite, Vue Router, Composition API, repositórios + `HttpApiClient`.

### Onde está a documentação da API?

Não há Swagger publicado; rotas principais estão no `README.md` e em `server.js` / `routes/`.

### Como autenticar chamadas à API?

Header `Authorization: Bearer <JWT>` após login ou `/auth/google`.

### Onde ficam os segredos?

`backend/.env` (local, não commitado), variáveis no **Render** e **Vercel** em produção.

### Qual banco usa em desenvolvimento local?

Por padrão **SQLite** (`file:./dev.db`). Postgres opcional via Docker.

### Como rodar localmente?

```bash
npm run install:all
cd backend && npm run db:push && npm run db:seed && cd ..
npm run dev
```

### O que é `npm run dev` na raiz?

Sobe backend (porta 3333) e frontend (5173); o front espera `/api/health` antes de abrir.

### Migrações de banco?

Pasta `backend/prisma/migrations/`; em produção `prisma migrate deploy`.

### O login Google valida o quê?

**ID token** do Google (`google-auth-library`), audience = `GOOGLE_CLIENT_ID`.

---

## 12. Deploy, ambiente e suporte

### Onde hospedar?

**Render** (API + Postgres), **Vercel** (SPA). Ver `DEPLOY.md`.

### Variáveis obrigatórias no Render?

`DATABASE_URL`, `JWT_SECRET`, `NODE_VERSION=20`, `FRONTEND_URL`; para Google: `GOOGLE_CLIENT_ID`.

### Variáveis na Vercel?

`VITE_API_BASE_URL=/api` e `VITE_GOOGLE_CLIENT_ID` (mesmo Client ID do Render).

### Build do Render falhou em `auth_provider`?

Faltava migração no Postgres; aplicar migração `20260603023000_user_google_auth` e redeploy.

### API lenta no plano free do Render?

Cold start após inatividade é normal no tier gratuito; primeira requisição pode demorar.

### Como verificar se a API está no ar?

`GET /api/health` → `"ok": true`.

### Onde reportar bugs ou pedir funcionalidades?

Canal definido pela equipe do TCC / mantenedor do repositório GitHub.

### Posso contribuir com código?

Siga `AGENTS.md` (padrões, design system, não commitar secrets). Pull requests conforme política do autor.

### O projeto é open source?

Consulte licença no repositório; contexto acadêmico (TCC) — ver README.

### Há testes automatizados?

Backlog prevê Vitest; cobertura automatizada pode ser limitada — validar manualmente fluxos críticos antes de apresentação/deploy.

---

## Glossário rápido

| Termo | Significado |
|-------|-------------|
| **Categoria** | Bolso de benefício (Alimentação, Mobilidade, …) |
| **Realocação** | Transferência de saldo entre categorias |
| **Utilização** | Gasto/saída de crédito |
| **Workflow** | Estados da transação (Pendente, Em análise, …) |
| **Política** | Limite/regra por perfil e categoria |
| **Fechamento** | Consolidação mensal (financeiro) |
| **Teto** | Limite máximo de categoria ou proposta de alteração |
| **JWT** | Token de sessão da API |

---

*FlexBen — FAQ interno. Para visão técnica resumida, veja também [README.md](README.md), [DEPLOY.md](DEPLOY.md) e [AGENTS.md](AGENTS.md).*
