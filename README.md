# FlexBen

Sistema de **benefícios flexíveis corporativos** (TCC): créditos internos, realocação, aprovação do gestor, governança RH e fechamento financeiro.

## Comece aqui

| Documento | Descrição |
|-----------|-----------|
| [CONTEXTUALIZACAO-PROJETO.md](CONTEXTUALIZACAO-PROJETO.md) | **Leia primeiro** — estrutura, como rodar, perfis, instruções para IA |
| `docs/` | Análise, escopo, checklist e diagramas (pasta local, não versionada) |

## Estrutura

```
.
├── backend/          # API Node.js (porta 3333)
├── vue-app/          # Frontend Vue 3 + Vite
├── docs/             # Documentação e materiais (gitignore)
├── samples/          # Exemplos (CSV de fechamento)
├── docker-compose.yml
└── package.json      # npm run dev
```

## Início rápido

```bash
npm run install:all
cd backend && npm run db:push && npm run db:seed && cd ..
npm run dev
```

Acesse o frontend na URL do Vite (geralmente `http://localhost:5173`). Contas demo na tela de login (senha `123`).

## Deploy (Render + Vercel)

Siga o guia **[DEPLOY.md](DEPLOY.md)** para publicar a API no Render e o frontend na Vercel.
