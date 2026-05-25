# Contextualização do projeto FlexBen

> **Para humanos e assistentes de IA:** a **raiz deste repositório** é o projeto completo. Edite e execute tudo a partir da pasta `projeto/` (sem subpasta `FlexBen/`).

Última atualização: maio/2026.

---

## 1. Estrutura do repositório

```
.
├── README.md
├── CONTEXTUALIZACAO-PROJETO.md   # Este arquivo
├── package.json                  # npm run dev (back + front)
├── docker-compose.yml            # Postgres opcional (evolução futura)
│
├── backend/                      # API REST — porta 3333
│   ├── .env                      # Segredos locais (não commitar)
│   ├── prisma/schema.prisma      # SQLite
│   └── src/                      # server, policyEngine, adapters audit
│
├── vue-app/                      # Frontend Vue 3 + Vite
│   └── src/                      # views, components, repositories, adapters
│
├── docs/                         # Documentação local (gitignore)
│   ├── ANALISE-PROJETO.md
│   ├── BASE-FUNCIONALIDADES-FLEX.md
│   ├── checklist-requisitos.md
│   ├── diagramas/, escopo/, telas-prototipo/
│   └── ...
│
└── samples/
    └── fechamento-financeiro-2026-05.csv
```

---

## 2. O produto em uma frase

Sistema de **créditos flexíveis internos**: a empresa define categorias e limites; o colaborador **realoca** e **usa** crédito; o gestor **aprova**; o RH **carrega e governa**; o financeiro **fecha o mês**.

---

## 3. Perfis e telas

| Perfil | Rotas principais |
|--------|------------------|
| Colaborador | `/dashboard`, `/realocar`, `/utilizacao`, `/transacoes` |
| Gestor | `/gestor/aprovacoes` |
| RH / Admin | `/rh/politicas`, `/categorias`, `/usuarios`, `/carga`, `/auditoria` |
| Financeiro | `/financeiro/fechamento` |

Contas demo (senha `123`): tela de login ou `backend/prisma/seed.js`.

---

## 4. Como rodar

```bash
npm run install:all
cd backend && npm run db:push && npm run db:seed && cd ..
npm run dev
```

### Porta 3333 em uso

```bash
kill $(lsof -t -i:3333) 2>/dev/null
```

---

## 5. Instruções para assistentes de IA

1. **Raiz:** `backend/`, `vue-app/`, `docs/` — paths relativos à raiz do repo.
2. **Não** recriar `vue-app/src/persistence/` com localStorage.
3. **Capacidades:** `vue-app/src/config/capabilities.js` e `router.js`.
4. **Regras de negócio:** `backend/src/lib/policyEngine.js`.
5. **Escopo acadêmico:** arquivos em `docs/` (pasta local).

---

## 6. Nomes

| Nome | Uso |
|------|-----|
| **FlexBen** | Nome do produto |
| **FlexBen** | Nome na UI |
| `flexben-workspace` | Pacote npm raiz |
