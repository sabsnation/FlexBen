# Manual do Usuário - FlexBen

**Sistema de Gestão de Benefícios Flexíveis**

---

## Antes de tudo o que fazer

Para garantir que o FlexBen funcione corretamente e tenha a melhor experiência com o sistema, verifique os seguintes itens:

● **Computador ou tablet:** Um computador com rato e teclado é mais confortável para preencher formulários. Também é possível usar via navegador em tablet.

● **Navegador:** Utilize o Google Chrome ou Microsoft Edge (versões recentes de 2026). Evite navegadores mais antigos para evitar erros de visualização.

● **Ligação à Internet:** Necessária pois o sistema está na nuvem (hospedado em Vercel e Render). Para testes locais, o técnico de informática indicará o endereço a abrir.

● **Resolução de ecrã:** O ideal é 1366 × 768 ou superior para melhor visualização de formulários e relatórios.

● **Dados de acesso:** Email cadastrado e Palavra-passe da organização que será fornecido pelo administrador. Você também pode utilizar autenticação via Google Sign-In se sua conta foi configurada dessa forma.

---

## Como entrar no sistema

**1. Abra o FlexBen no seu navegador**

Aceda a: `https://flexben.vercel.app` (ambiente de produção)

Ou em teste local: `http://localhost:5173`

**2. Preencha as informações de acesso**

Na tela de login, terá duas opções:

**Opção A - Entrar com email e senha:**
- Preencha o campo de email com o seu email cadastrado
- Insira a palavra-passe fornecida pela organização
- Clique no botão "Entrar"

**Opção B - Entrar com Google:**
- Clique no botão "Entrar com Google" abaixo do botão de entrar
- Selecione a sua conta Google
- Autorize o acesso ao sistema
- Será redirecionado automaticamente para o painel

**3. Campo de Demonstração (se aplicável)**

Se aparecer o campo "Demonstração", é apenas um campo onde tem emails fictícios para fins de teste do sistema. (Não será entregue à organização com esta função.)

**Dados de teste disponíveis:**

| Email | Palavra-passe | Perfil |
|-------|---------------|--------|
| sabrina.admin@empresa.com | 123 | Administrador |
| gestor@empresa.com | 123 | Gestor |
| financeiro@empresa.com | 123 | Financeiro |
| joao.silva@empresa.com | 123 | Colaborador |

---

## Primeiro acesso - Alterar palavra-passe

Se recebeu uma palavra-passe provisória, é recomendável alterá-la no primeiro acesso:

1. Após efetuar login, clique no ícone de Perfil (no canto superior direito)
2. Selecione "Alterar Palavra-passe"
3. Insira a palavra-passe anterior
4. Digite a nova palavra-passe (mínimo 8 caracteres, com números e símbolos recomendado)
5. Confirme a nova palavra-passe
6. Clique em "Guardar"

---

## Funcionalidades por Perfil de Utilizador

### Colaborador (Funcionário)

O colaborador pode executar as seguintes ações:

**1. Consultar Saldos de Benefícios**
- Aceda ao Dashboard
- Veja o saldo total por categoria de benefício
- Visualize avisos de vencimento ou limites próximos

**2. Realocar Créditos entre Categorias**
- Clique em "Realocar"
- Escolha a categoria de origem (de onde vem o crédito)
- Escolha a categoria de destino (para onde vai o crédito)
- Informe o valor a realocar
- Clique em "Solicitar Realocação"
- Nota: Esta operação pode exigir aprovação do seu gestor, dependendo da política definida

**3. Registar Utilização de Benefício**
- Clique em "Utilização"
- Selecione a categoria do benefício utilizado
- Insira o valor gasto
- Adicione uma descrição (opcional)
- Clique em "Registar Uso"

**4. Consultar Histórico de Transações**
- Aceda a "Minhas Transações" ou "Histórico"
- Veja todas as suas movimentações
- Verifique o status: Pendente, Em análise, Concluída, Reprovada
- Filtre por data ou categoria se necessário

**5. Visualizar Políticas e Limites**
- Aceda a "Categorias" ou "Consultar Limites"
- Veja os valores máximos por categoria
- Entenda as regras de realocação aplicáveis

---

### Gestor (Manager)

O gestor tem as seguintes responsabilidades:

**1. Aprovar Realocações**
- Aceda a "Aprovações"
- Visualize a fila de realocações pendentes de análise
- Clique em cada solicitação para revisar os detalhes
- Leia o motivo apresentado pelo colaborador
- Clique em "Aprovar" ou "Reprovar"
- Se reprovar, adicione o motivo da rejeição
- O colaborador será notificado da decisão

**2. Monitorar SLA (Prazo de Resposta)**
- Visualize quantas aprovações estão atrasadas (marcadas em vermelho)
- Identifique quais realocações vencem em breve
- Consulte o dashboard de performance

**3. Aprovar Propostas de Teto**
- Analise propostas de aumento de limite de categoria
- Revise a justificativa fornecida
- Aprove ou reprove com comentário

---

### RH / Administrador

O administrador tem acesso total ao sistema:

**1. Criar e Gerir Categorias**
- Aceda a "Categorias"
- Clique em "Nova Categoria"
- Preencha:
  - Nome da categoria (ex: "Alimentação", "Saúde")
  - Limite mensal máximo
  - Descrição
- Clique em "Criar"

**2. Convidar Novos Utilizadores**
- Aceda a "Utilizadores"
- Clique em "Convidar Novo Utilizador"
- Preencha:
  - Email do utilizador
  - Nome completo
  - Perfil (Colaborador, Gestor, Financeiro, Admin)
  - Tipo de autenticação (Senha ou Google)
- Clique em "Enviar Convite"
- O utilizador receberá um email com instruções de acesso

**3. Definir Políticas de Realocação**
- Aceda a "Políticas"
- Clique em "Nova Política"
- Configure:
  - Limite máximo por transação
  - Categorias envolvidas
  - Quem necessita aprovar
  - Horários de aplicação (opcional)
- Guarde a política

**4. Processar Carga Mensal de Créditos**
- Aceda a "Carga Mensal"
- Clique em "Processar Carga"
- Selecione o ficheiro com dados (CSV ou JSON)
- Revise os dados antes de confirmar
- Valide se as informações estão corretas
- Clique em "Confirmar Carga"
- Os colaboradores receberão notificação da carga

**5. Consultar Auditoria Completa**
- Aceda a "Auditoria"
- Visualize o log completo de todas as operações do sistema
- Filtre por:
  - Utilizador
  - Tipo de evento (login, criação, aprovação, etc)
  - Data e hora
- Exporte relatório se necessário (PDF, Excel)

---

### Financeiro

O departamento de Financeiro pode:

**1. Acompanhar Fechamento Mensal**
- Aceda a "Fechamento"
- Selecione o mês e ano desejado
- Visualize:
  - Créditos alocados (orçamento previsto)
  - Realocações processadas
  - Utilizações registadas
  - Saldo previsto vs. realizado
  - Diferenças e variações
- Clique em "Exportar" para gerar relatório (PDF, Excel, CSV)

**2. Alocar Créditos a Colaboradores**
- Aceda a "Alocação"
- Selecione os beneficiários ou grupos
- Configure:
  - Valores por categoria
  - Data de vigência
  - Centro de custo (se aplicável)
- Clique em "Alocar"

**3. Gerir Propostas de Teto**
- Aceda a "Tetos"
- Veja propostas de aumento de limite por categoria
- Crie novas propostas se necessário
- Acompanhe aprovações do gestor
- Visualize histórico de mudanças de limites

**4. Gerar Relatórios**
- Aceda a "Relatórios"
- Selecione o tipo de relatório desejado
- Configure filtros (período, categoria, utilizador)
- Clique em "Gerar"
- Exporte em diversos formatos

---

## Exemplos Práticos de Utilização

### Exemplo 1: Colaborador realoca créditos

**Situação:** João tem R$ 500 em Alimentação mas precisa de Mobilidade.

1. Acede ao Dashboard
2. Verifica: Alimentação R$ 500 | Mobilidade R$ 0
3. Clica em "Realocar"
4. Preenche:
   - De: "Alimentação"
   - Para: "Mobilidade"
   - Valor: R$ 200
5. Clica "Solicitar Realocação"
6. Aparece mensagem de confirmação
7. O gestor recebe notificação
8. Após aprovação, os saldos são atualizados

### Exemplo 2: RH processa carga mensal

**Situação:** Processamento de benefícios para junho/2026.

1. RH aceda a "Carga Mensal"
2. Prepara ficheiro com créditos de cada colaborador
3. Clica em "Processar Carga"
4. Faz upload do ficheiro
5. Sistema valida os dados
6. RH revê e confirma
7. Carga é processada
8. Colaboradores veem saldos atualizados no Dashboard

### Exemplo 3: Gestor aprova realocação

**Situação:** Colaborador solicitou realocação de Saúde para Alimentação.

1. Gestor recebe notificação
2. Aceda a "Aprovações"
3. Vê solicitação com detalhes:
   - Colaborador: João Silva
   - De: Saúde R$ 300 → Para: Alimentação R$ 300
   - Motivo: Alimentação no fim do mês
4. Clica "Aprovar"
5. Sistema processa a realocação
6. João é notificado

---

## Notificações e Alertas

O sistema envia notificações para:

● **Colaborador:** Realocação aprovada/reprovada, saldo baixo, eventos importantes
● **Gestor:** Realocação aguardando aprovação, SLA próximo de vencer
● **RH:** Carga processada, erros de validação
● **Financeiro:** Fechamento disponível, propostas de teto

As notificações aparecem no ícone de campainha (sino) no topo direito da tela.

---

## Segurança e Boas Práticas

**Faça:**
- Altere a palavra-passe no primeiro acesso
- Faça logout ao sair do sistema (especialmente em computadores partilhados)
- Use palavras-passe fortes (mínimo 8 caracteres)
- Verifique emails de confirmação em operações importantes
- Reporte qualquer atividade suspeita

**Não faça:**
- Partilhe a sua palavra-passe com colegas
- Registre informações sensíveis em campos de descrição
- Deixe o navegador logado em máquinas públicas
- Ignore avisos de segurança do sistema
- Feche abruptamente o navegador sem fazer logout

---

## Dúvidas Frequentes

**P: Não consigo fazer login. O que fazer?**
R: Verifique se o navegador permite cookies. Limpe cache e cookies (Ctrl+Shift+Del no Windows/Linux ou Cmd+Shift+Del no Mac). Tente novo navegador. Se o problema persistir, contacte o administrador.

**P: Google Sign-In não funciona.**
R: Verifique se está autenticado na sua conta Google. Confirme que JavaScript está ativado. Tente em modo incógnito (sem extensões do navegador).

**P: A realocação não aparece na fila do gestor.**
R: Atualize a página (F5). Verifique se a realocação exige aprovação conforme a política. Confirme se há notificação no ícone de campainha.

**P: Os valores aparecem errados.**
R: Os valores são em Reais (R$) com formato português: ponto (.) = milhar, vírgula (,) = decimal. Exemplo: R$ 1.000,50 = mil reais e cinquenta centavos.

**P: Como exportar um relatório?**
R: Abra o módulo correspondente (Fechamento, Alocação, etc), configure os filtros desejados e clique em "Exportar". Escolha o formato (PDF, Excel, CSV).

---

## Contacto para Suporte

| Problema | Contacto |
|----------|----------|
| Acesso ou palavra-passe | Administrador do sistema |
| Dúvidas sobre funcionalidades | Seu gestor imediato |
| Erros técnicos | Suporte TI / Desenvolvedor |
| Questões de auditoria | Departamento de RH |

---

**FlexBen - Sistema de Gestão de Benefícios Flexíveis**
Versão 1.0 — Junho 2026
Projeto Acadêmico (TCC)
