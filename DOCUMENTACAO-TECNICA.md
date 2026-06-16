# Documentação Técnica — FlexBen

> Seções 5.2.6 a 5.2.9 da documentação do projeto.

---

## 5.2.6 Boas Práticas e Convenções

O projeto **FlexBen** foi desenvolvido seguindo princípios consolidados de engenharia de software, buscando garantir a qualidade, manutenibilidade e segurança do código. A arquitetura adota padrões de design reconhecidos pela indústria, aplicando os princípios SOLID, Clean Code e práticas modernas de JavaScript/Node.js.

### Princípios SOLID — Inversão de Dependência

A inversão de dependência (DIP — Dependency Inversion Principle) é um dos pilares da arquitetura do FlexBen, manifestando-se principalmente através do padrão **Adapter** na camada de auditoria. Em vez de o código de negócio depender diretamente de implementações concretas como Firestore ou MongoDB, o sistema define uma abstração comum que permite trocar provedores de armazenamento sem alterar a lógica central.

No arquivo `backend/src/adapters/audit/createAuditAdapter.js`, uma factory function encapsula a lógica de seleção da implementação correta. O domínio da aplicação, particularmente o módulo `businessAudit.js`, invoca uma função genérica `logBusinessEvent()` sem conhecimento algum sobre qual banco de dados será utilizado. A decisão é tomada em tempo de inicialização baseada em variáveis de ambiente, permitindo que o mesmo código funcione em ambientes distintos (desenvolvimento com Noop, produção com Firestore ou MongoDB) sem modificações.

Este design oferece benefícios significativos: testes unitários podem injetar um adapter mock, o código de produção pode alternar provedores sem recompilação, e novos provedores podem ser adicionados sem impactar o domínio. O padrão demonstra como a inversão de controle (inversão de quem decide qual implementação usar) resulta em código mais flexível e testável.

### Clean Code — Clareza e Legibilidade

O projeto adota os princípios de Clean Code para garantir que o código seja compreensível à primeira leitura. Todos os nomes de variáveis, funções e módulos são expressivos e reveladoras de intenção. A função `balanceInCategory(userId, categoria)`, por exemplo, deixa evidente que calcula o saldo de um usuário em uma categoria específica, sem necessidade de comentários explicativos.

As funções mantêm responsabilidades únicas e bem delimitadas. A função `parseMoney(value)` realiza apenas uma tarefa: normalizar valores monetários garantindo precisão decimal com duas casas. Não trata validação de regras de negócio, não realiza persistência — apenas transforma um valor bruto em um número decimal confiável. Da mesma forma, `asyncHandler(fn)` envolve funções assíncronas para capturar erros de forma consistente, deixando que o middleware global de tratamento de erros tome as decisões sobre status HTTP e mensagens de resposta.

O código é autodocumentado através de nomes claros, funções pequenas e estrutura lógica. Comentários são usados apenas quando a intenção não é óbvia pelo código, como em casos de constraints ocultas ou workarounds específicos. Isso contrasta com projetos que mantêm comentários descrevendo o "quê" (desnecessário se o nome é claro) e prefere documentar o "porquê" apenas quando relevante.

### Data Transfer Objects — Encapsulamento de Dados

O projeto utiliza o padrão DTO (Data Transfer Object) para desacoplar as representações internas (modelos Prisma) das respostas enviadas ao cliente. Esta prática oferece múltiplas vantagens: impede que dados sensíveis vazem acidentalmente, reduz o tamanho das respostas transmitidas, e permite evoluir o schema interno sem quebrar contratos de API.

A função `publicUser(user, options)` exemplifica este padrão. Quando um usuário é retornado pela API, passa por esta função que reconstrói o objeto incluindo apenas campos apropriados. O hash da senha (`passwordHash`), o identificador Google (`googleSub`) e outros dados internos nunca são incluídos na resposta. Além disso, a função calcula o campo `initials` (primeiras letras do nome) que é enviado ao frontend, economizando processamento no cliente e garantindo consistência. O parâmetro `includeAvatar` permite controlar se a imagem em Base64 deve ser incluída, otimizando o tamanho da resposta em listagens onde avatares não são necessários.

De forma similar, `serializeTransaction(row)` converte a entidade de transação do banco em um objeto de resposta contendo apenas campos relevantes. O e-mail é normalizado em minúsculas, valores são convertidos para números (em vez de strings), e qualquer campo ausente recebe um padrão seguro. Este DTO funciona como um contrato entre backend e frontend, permitindo que ambas as camadas evoluam de forma mais independente.

### Tratamento de Erros e Exceções

O tratamento robusto de erros é essencial em uma aplicação corporativa. O FlexBen implementa uma estratégia em camadas que garante que erros internos nunca sejam expostos ao usuário final.

O `asyncHandler` envolve todos os endpoints assíncronos, capturando promessas rejeitadas e encaminhando-as para o middleware de tratamento global de erros. Isso centraliza a lógica de conversão de exceções em respostas HTTP apropriadas. Erros de validação (entrada inválida) resultam em 400 Bad Request com mensagem legível. Erros de autorização (acesso negado) resultam em 403 Forbidden. Erros de recurso não encontrado resultam em 404 Not Found. Conflitos de banco (duplicação de chave) resultam em 409 Conflict.

O middleware global, localizado no final da cadeia de handlers, captura qualquer erro não tratado especificamente. Para erros de arquivo grande, retorna status 413 com sugestão de compressão de imagem. Para erros de duplicação de banco (código P2002 do Prisma), retorna 409 com mensagem "Registro duplicado". Para qualquer outro erro inesperado, retorna 500 com mensagem genérica sem detalhar a causa interna, prevenindo assim que stack traces sejam expostos em produção.

Mensagens de erro são sempre em português brasileiro, fazendo sentido para o usuário final da aplicação. Não são expostas detalhes técnicos ou nomes de exceções internas que confundiriam usuários não técnicos.

### Versionamento Semântico

O projeto adota versionamento semântico (MAJOR.MINOR.PATCH) seguindo a especificação oficial. O histórico de versões reflete a evolução do sistema de forma clara:

- **v1.0.0**: Primeira versão funcional com autenticação, transações básicas e workflow de aprovação gerencial
- **v1.1.0**: Adição de tetos de benefício (ceiling proposals) e governança de limites
- **v1.2.0**: Sistema de notificações em tempo real e mensageria assíncrona
- **v2.0.0**: Redesign arquitetural com adapters, DTOs e reorganização de rotas
- **v2.1.0**: Suporte a créditos com múltiplas alocações e carga mensal

O histórico de commits no Git segue a convenção Conventional Commits, permitindo rastreamento automático de mudanças. Commits são prefixados com `feat:` (nova funcionalidade), `fix:` (correção de bug), `refactor:` (reorganização sem mudança de comportamento) ou `docs:` (atualizações de documentação), facilitando a geração automática de changelogs.

### Padrão de Resposta de API

Todas as respostas da API seguem uma estrutura consistente, facilitando o consumo previsível pelo frontend. Respostas bem-sucedidas (2xx) retornam um objeto JSON contendo os dados solicitados, frequentemente com um nível de ninhamento que nomeia explicitamente o tipo de recurso.

Para um login bem-sucedido, a resposta inclui campos `token` (o JWT para autenticação subsequente) e `user` (objeto DTO com dados do usuário). Para listagens, a resposta inclui campos como `transactions`, `balances`, `categories`, claramente nomeando cada recurso. Para criação de recurso com sucesso, o status HTTP é 201 Created e o corpo inclui o objeto criado serializado.

Em caso de erro, a resposta sempre inclui um campo `message` contendo uma descrição legível em português. Não há exposição de stack traces, códigos de erro técnicos, ou detalhes que confundiriam usuários finais. O status HTTP comunica a classe de erro (4xx para erro cliente, 5xx para erro servidor), enquanto a mensagem no corpo fornece contexto específico.

### Injeção de Dependência

O projeto evita acoplamento rígido através de injeção de dependência, facilitando testes e flexibilidade de configuração. O padrão factory é usado para criar instâncias de componentes críticos baseado em configuração em tempo de execução.

A função `createMessageBroker()` exemplifica este padrão. Em vez de a aplicação instanciar diretamente um RabbitMqBroker ou InlineMessageBroker, a factory verifica se `RABBITMQ_URL` está configurado. Se estiver, cria um RabbitMqBroker que se conecta à fila de mensagens distribuída. Se não estiver, retorna um InlineMessageBroker que processa eventos no mesmo processo. O resto da aplicação não precisa saber qual implementação foi escolhida; apenas chama métodos da interface comum.

Este padrão permite que a mesma aplicação execute em ambientes diversos: desenvolvimento local pode usar inline processing, staging pode usar RabbitMQ em Docker, produção pode usar RabbitMQ em nuvem. Nenhuma mudança de código é necessária; apenas variáveis de ambiente mudam.

Da mesma forma, na rota de créditos, dependências como `authRequired`, `roleRequired`, `asyncHandler` são passadas como argumentos à função `registerCreditRoutes`, permitindo que testes injetem versões mock dessas dependências para validar comportamento isoladamente.

### Mapeamento de Objetos

A transformação de objetos entre camadas é centralizada em funções de serialização bem nomeadas. Quando uma entidade é recuperada do banco de dados, frequentemente necessita ser transformada antes de ser enviada ao cliente. Este mapeamento ocorre em um único lugar, garantindo consistência e facilitando manutenção.

A função `serializeTransaction` converte a entidade bruta do Prisma em um objeto de resposta. O e-mail é normalizado, tipos de dados são garantidos (número em vez de string), campos opcionais recebem valores padrão. Se futuramente precisarmos adicionar um novo campo calculado a todas as transações (ex: dias desde criação), alteramos apenas esta função — todas as rotas que retornam transações herdam automaticamente o novo comportamento.

Funções como `serializeCeilingProposal`, `serializeNotification` e `serializeWorkflowEvent` seguem o mesmo padrão, cada uma responsável por transformar sua respectiva entidade em formato apropriado para cliente. Isso cria um contrato bem definido entre as camadas: backend garante que nunca campos internos vazam, frontend recebe estrutura previsível e pode contar com tipos de dados específicos.

### Segurança Básica

A segurança permeia toda a arquitetura, começando com proteção de dados sensíveis. Todas as chaves de API, senhas de banco, e credenciais de serviços externos são armazenadas em variáveis de ambiente, nunca no código. O arquivo `.env` é incluído no `.gitignore`, prevenindo commits acidentais de credenciais. Em produção, plataformas como Render e Vercel gerenciam variáveis de ambiente através de interfaces seguras, sem exposição em repositório ou logs.

Senhas de usuário são criptografadas com bcrypt, um algoritmo de hash adaptável que aplica salt e múltiplas rodadas de hash. Quando um usuário registra uma senha, ela é hasheada com `bcrypt.hash(senha, 10)`, onde 10 é o número de rodadas de computação. Isso torna praticamente impossível recuperar a senha original mesmo que alguém ganhe acesso ao banco de dados. Na autenticação, a senha fornecida é comparada com o hash usando `bcrypt.compare(senha, hash)`, que executa o mesmo algoritmo e compara o resultado.

Tokens JWT incluem informações essenciais (id, email, role) assinadas com `JWT_SECRET`. O token expira em 12 horas, forçando reautenticação periódica. O token é armazenado no cliente em `localStorage` e enviado em cada requisição no header `Authorization: Bearer ...`. O backend valida a assinatura e data de expiração antes de processar qualquer requisição autenticada.

A autenticação Google é implementada com segurança server-side. O cliente recebe um ID token de Google, que é uma JWT assinada pelos servidores Google. O backend não confia no token apenas porque o cliente enviou — valida a assinatura usando as chaves públicas do Google obtidas em tempo real de `https://www.googleapis.com/oauth2/v1/certs`. Só após validação bem-sucedida o usuário é considerado autenticado.

CORS (Cross-Origin Resource Sharing) é configurado restritivamente. Em desenvolvimento, permite qualquer origem. Em produção, apenas URLs autorizadas (Vercel, Render) podem fazer requisições de navegador. Isso previne scripts maliciosos em sites third-party de fazer requisições em nome do usuário logado.

Avatares de usuário são validados quanto ao tamanho (máximo 5MB comprimido) e formato (deve começar com `data:image/`). Isso previne upload de arquivos grandes demais ou de tipos inesperados que poderiam sobrecarregar o servidor ou executar código malicioso.

---

## 5.2.7 Requisitos de Infraestrutura

Para que o FlexBen funcione adequadamente, tanto em ambiente de desenvolvimento quanto em produção, é necessário garantir que certos requisitos de infraestrutura sejam atendidos. Esta seção detalha as especificações técnicas necessárias para rodar a aplicação em diferentes cenários.

### Ambiente de Execução

O backend do FlexBen é desenvolvido em Node.js, um runtime JavaScript voltado para aplicações server-side. A versão mínima suportada é Node.js 20 ou superior, especificado no campo `engines.node` do `package.json`. Esta versão inclui funcionalidades modernas de JavaScript e segurança aprimorada comparada a versões anteriores. O gerenciador de pacotes npm (Node Package Manager) é incluído automaticamente com Node.js, com versão mínima 10 recomendada.

O banco de dados em ambiente local é SQLite 3.x, um banco de dados embarcado que requer zero configuração. SQLite armazena todos os dados em um arquivo único (`backend/dev.db`), ideal para desenvolvimento e testes locais sem necessidade de servidor de banco separado. Em produção, o sistema utiliza PostgreSQL versão 13 ou superior, um banco de dados relacional robusto e escalável adequado para ambiente corporativo.

O frontend é desenvolvido em Vue.js 3 com Vite como bundler. Qualquer navegador moderno funciona — Chrome, Firefox, Safari, Edge em suas versões recentes suportam os recursos utilizados (ES6+, APIs fetch, Web Storage).

### Servidor Local — Requisitos Mínimos

Para desenvolvimento local confortável, recomenda-se uma máquina com processador moderno (mínimo 1 core, recomendado 2+ cores), 512MB de RAM em mínimo absoluto e 2GB recomendado. O disco necessário é aproximadamente 200MB para o código e dependências instaladas, 1GB recomendado para margem de operação.

Largura de banda não é crítica em desenvolvimento local. Durante as instalações iniciais, recomenda-se 5Mbps mínimo para download de dependências npm. Após instalado, a aplicação executa localmente sem dependência significativa de internet, exceto para funcionalidades como autenticação Google que necessitam contactar servidores externos.

### Setup de Desenvolvimento

O processo de setup inicial envolve três etapas principais. Primeiro, instalar todas as dependências npm do backend e frontend com o comando `npm run install:all`, que executa `npm install` em ambos os diretórios. Segundo, configurar o banco de dados local com `npm run db:push` que usa Prisma para criar o schema SQLite, seguido de `npm run db:seed` que carrega dados de demonstração (usuários, categorias, políticas). Terceira, iniciar o servidor de desenvolvimento com `npm run dev`, que inicia simultaneamente o backend na porta 3333 e o frontend Vite na porta 5173, com o frontend aguardando o health check da API antes de iniciar completamente.

O arquivo `.env` deve ser criado no diretório `backend/` com variáveis de configuração. Um template `backend/.env.example` serve como referência. No mínimo, `DATABASE_URL` deve apontar para o arquivo SQLite local e `JWT_SECRET` deve ter um valor aleatório para assinar tokens JWT.

O frontend acessa a API através de um proxy configurado no Vite. Requisições para `/api/*` são encaminhadas para `http://127.0.0.1:3333`, permitindo que o frontend rode em `http://localhost:5173` mas acesse a API como se fosse no mesmo domínio, evitando problemas de CORS em desenvolvimento.

### Portas Utilizadas

Em ambiente local, dois serviços principais consomem portas na rede. O frontend Vue (via Vite) executa na porta 5173 e é acessível em `http://localhost:5173`. O backend Express executa na porta 3333 e oferece endpoints de API em `http://127.0.0.1:3333`. O ponto de entrada principal para usuários é a porta 5173; a porta 3333 é acessada indiretamente através do proxy do frontend.

Ocasionalmente, uma porta pode estar em uso por outro processo. Se a porta 3333 estiver ocupada, o script `npm run dev:kill-port` encerra qualquer processo usando aquela porta, ou manualmente pode-se usar `kill $(lsof -t -i:3333)`. Alternativamente, a variável de ambiente `PORT` no `.env` pode especificar uma porta diferente.

### Ambiente de Produção — Render

O backend é hospedado em Render, uma plataforma cloud que oferece suporte a Node.js. O plano Starter é gratuito mas com limitações (dorme se inativo), enquanto o Standard ($12/mês aproximadamente) oferece execução contínua. Cada instância recebe 512MB de RAM no Starter, 1GB no Standard, e processamento compartilhado ou dedicado conforme plano.

O Render inclui um PostgreSQL integrado onde é possível criar um banco de dados automaticamente através do Blueprint fornecido no repositório. O deployment é acionado automaticamente quando novos commits são feitos à branch principal — Render faz clone do repositório, instala dependências com `npm install`, gera cliente Prisma com `npx prisma generate`, executa migrações pendentes com `npx prisma migrate deploy`, carrega dados iniciais com `npm run db:seed`, e inicia o servidor com `npm start`.

### Ambiente de Produção — Vercel

O frontend é hospedado em Vercel, plataforma especializada em deployments de aplicações Node.js e SPAs. O plano Hobby é gratuito, com Pro ($20/mês) oferecendo features adicionais. Durante o build, Vercel executa `npm run build` no diretório `vue-app`, gerando arquivos estáticos em `/dist` que são servidos globalmente através de CDN.

Um arquivo `vercel.json` na raiz do repositório configura rewrites: requisições para `/api/*` são encaminhadas para `https://flexben.onrender.com` (ou o URL da API em produção). Isso permite que o frontend hosted em Vercel acesse a API hosted em Render como se fossem no mesmo domínio, evitando problemas de CORS.

### Serviços Adicionais Opcionais

A auditoria pode usar Firestore (Google Cloud) ou MongoDB, ambos oferecendo plano gratuito — Firestore permite 1 milhão de operações por mês gratuitamente, MongoDB Atlas oferece 512MB de storage gratuito. Se nenhum serviço de auditoria estiver configurado, o sistema usa um Noop adapter que descarta eventos de auditoria sem os persistir.

Mensageria pode usar RabbitMQ, seja através de Docker localmente ou através de serviço em nuvem como CloudAMQP. Se não configurado, eventos são processados inline no mesmo processo, mais lento mas sem infraestrutura extra.

Email para recuperação de senha usa SMTP — pode ser Gmail com app password, SendGrid, ou servidor corporativo. Se não configurado, a funcionalidade está desligada e usuários não conseguem recuperar acesso perdido.

---

## 5.2.8 APIs e Integrações Externas

O FlexBen integra-se com diversos serviços externos para estender sua funcionalidade além do escopo local. Estas integrações oferecem capacidades de autenticação moderna, armazenamento distribuído de auditoria, processamento assíncrono de notificações e comunicação por email. Cada integração é opcional ou possui fallback, permitindo que a aplicação funcione em diferentes ambientes.

### Google Identity Services — Autenticação OAuth 2.0

Para reduzir a fricção de acesso e elevar a segurança, o FlexBen oferece autenticação através de contas Google. Colaboradores da empresa que possuem email corporativo com Google Workspace (anteriormente G Suite) podem fazer login sem necessidade de gerenciar senhas adicionais dentro do FlexBen.

O fluxo começa quando um usuário clica em um botão "Entrar com Google" na tela de login. A biblioteca Google Identity Services (GIS) gerenciada pelo frontend apresenta uma interface de autenticação Google, onde o usuário fornece suas credenciais. Google retorna um ID token, que é uma JSON Web Token (JWT) assinada por Google contendo informações do usuário autenticado. O frontend envia este ID token para o backend no endpoint `POST /api/auth/google` dentro do campo `credential`.

O backend recebe o token e valida sua autenticidade consultando as chaves públicas de Google (endpoints `https://www.googleapis.com/oauth2/v1/certs`). Após confirmação de que o token foi de fato emitido por Google e não foi falsificado ou expirado, o backend extrai informações do usuário como email e `sub` (identificador único Google). O backend verifica se um usuário com aquele email existe no banco de dados. Se existir e tiver `authProvider` configurado como 'google', o login é aceito. Se não existir ou estiver configurado como 'password', o login é rejeitado com mensagem indicando que o acesso foi negado.

O backend então emite seu próprio JWT com data de expiração de 12 horas, contendo o identificador do usuário, email e papel (role). Este token é armazenado no frontend e enviado em todas as requisições subsequentes, permitindo autenticação sem contato adicional com Google.

Configuração requer criar um projeto no Google Cloud Console, ativar Google Identity Services, gerar um OAuth 2.0 Client ID, e adicionar origins autorizadas (URLs onde o GIS será carregado) e redirect URIs. O mesmo Client ID deve ser compartilhado entre frontend (variável `VITE_GOOGLE_CLIENT_ID`) e backend (variável `GOOGLE_CLIENT_ID`). Em produção, origins autorizadas incluem o domínio Vercel do frontend e em desenvolvimento inclui `localhost:5173`.

### Firebase Firestore — Auditoria Distribuída

Para cumprir requisitos de conformidade e permitir análise de eventos críticos, o FlexBen registra uma trilha de auditoria (audit log) de todas as operações sensíveis. Firestore, serviço NoSQL oferecido por Google Cloud, armazena estes eventos de forma distribuída e escalável.

Quando operações críticas ocorrem — um usuário faz login, realoca crédito, um gestor aprova uma solicitação, um teto de benefício é proposto — o backend registra um evento através de `logBusinessEvent()`. Este evento inclui campos como timestamp, ação realizada, email de quem realizou, módulo afetado, ID da entidade envolvida e payload com contexto. O evento é encaminhado a um adapter de auditoria, que neste caso é o FirestoreAuditAdapter.

O adapter conecta ao Firestore usando credenciais fornecidas como arquivo JSON de Service Account. Este arquivo contém chaves privadas e autenticação necessária para criar documentos em uma collection específica. O adapter cria um novo documento em `/audit/` com ID único, contendo todos os campos do evento. Firestore automaticamente indexa documentos, permitindo consultas futuras de eventos por ator, ação, data, ou entidade afetada.

Esta abordagem oferece trilha auditável não-repudiável: uma vez registrado, um evento não pode ser modificado ou deletado sem deixar rastro (Firestore mantém histórico de versões). Conformidade regulatória como LGPD exige exatamente este tipo de log para demonstrar quem fez o quê e quando.

Configuração envolve criar projeto no Google Cloud, ativar Firestore Database, criar Service Account, e fazer download das credenciais em formato JSON. O JSON é codificado como string única e armazenado na variável de ambiente `FIREBASE_SERVICE_ACCOUNT` ou referenciado como caminho em `FIREBASE_SERVICE_ACCOUNT_PATH`.

### MongoDB — Auditoria Alternativa

Como alternativa a Firestore, o FlexBen pode armazenar auditoria em MongoDB, banco de dados NoSQL baseado em documentos com modelo de dados flexível. MongoDB oferece plano gratuito (512MB) através do Atlas (serviço em nuvem) ou pode ser hospedado localmente via Docker.

A integração é similar a Firestore: eventos críticos são capturados pela mesma função `logBusinessEvent()`, mas desta vez o MongoAuditAdapter processa o evento. O adapter conecta ao MongoDB usando connection string fornecida em `MONGODB_URI`, autentica com credenciais embutidas na string, e insere um novo documento na collection `audit_events`. MongoDB não requer schema pré-definido, então documentos podem ter estrutura ligeiramente variável.

O choice entre Firestore e MongoDB é feito em tempo de inicialização baseado em variáveis de ambiente. Se `AUDIT_PROVIDER` está explicitamente setado, aquele provider é usado. Caso contrário, se `MONGODB_URI` está definido, usa MongoDB. Caso contrário, se credenciais Firebase estão definidas, usa Firestore. Se nada está configurado, usa NoopAuditAdapter que simplesmente descarta eventos sem persistência.

### RabbitMQ — Processamento Assíncrono de Notificações

Quando gestor precisa ser notificado de uma aprovação pendente ou financeiro de um fechamento finalizado, as notificações devem chegar rapidamente sem bloquear a operação original. Para alcançar isso de forma robusta e escalável, o FlexBen usa RabbitMQ, um message broker que implementa protocolo AMQP (Advanced Message Queuing Protocol).

Quando uma solicitação de aprovação é criada, ao invés de notificar o gestor sincronamente (esperando), o backend publica um evento na fila `flexben.notifications`. Este evento contém tipo de notificação (ex: `APPROVAL_SUBMITTED`), payload com detalhes (ID da transação, email de quem solicitou, nome do beneficiário), e timestamp. A função de publicação retorna imediatamente; o evento foi entregue à fila e será processado em breve.

Um consumer rodando em background (também no backend ou em processo separado) conecta ao RabbitMQ, se inscreve à fila `flexben.notifications`, e aguarda mensagens. Quando uma mensagem chega, o consumer a processa — para `APPROVAL_SUBMITTED`, cria um registro na tabela `notifications` do banco de dados para o gestor relevante. O frontend periodicamente ou via WebSocket sincroniza notificações do backend e as exibe ao usuário.

Esta arquitetura oferece benefícios: operação original não é bloqueada esperando processamento de notificação, notificações podem ser re-tentadas se falhareaem, múltiplas instâncias do consumer podem processar fila em paralelo para escalabilidade.

Em desenvolvimento, se `RABBITMQ_URL` não está configurado, o sistema usa `InlineMessageBroker` que processa eventos no mesmo processo — mais lento mas sem infraestrutura extra. Em produção, RabbitMQ pode rodar em Docker ou ser um serviço gerenciado como CloudAMQP.

### SMTP — Recuperação de Senha

Quando usuário esquece sua senha, ele acessa a tela de recuperação e fornece seu email. O backend verifica se aquele email existe no banco de dados, e se existir, envia um email com instruções. O backend usa protocolo SMTP (Simple Mail Transfer Protocol) para enviar o email através de um serviço de email como Gmail ou SendGrid.

Configuração envolve definir `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` em variáveis de ambiente. Para Gmail, usa-se `smtp.gmail.com` porta 587 e um "app password" gerado em configurações de segurança Google (diferente da senha Google regular). Para SendGrid, usa-se `smtp.sendgrid.net` e a senha é uma chave de API. O campo `SMTP_FROM` especifica o endereço que aparecerá como remetente.

Se SMTP não está configurado, a funcionalidade de recuperação de senha é efetivamente desligada e usuários não conseguem recuperar acesso perdido sem intervenção manual do administrador. Portanto, é recomendado configurar SMTP em produção.

---

## 5.2.9 Caracterização da API

A API do FlexBen é desenvolvida como REST (Representational State Transfer), um estilo arquitetural baseado em padrões HTTP bem conhecidos. Todos os dados são trocados em formato JSON (JavaScript Object Notation), proporcionando interoperabilidade com qualquer cliente capaz de fazer requisições HTTP e processar JSON.

### Padrão Arquitetural REST

O FlexBen implementa uma arquitetura REST verdadeira, onde recursos são endereçados via URLs específicas e manipulados através de métodos HTTP padrão. Não há RPC (Remote Procedure Call) nem GraphQL; a API é puramente REST.

A base de todos os endpoints é `/api`. Um health check está disponível em `GET /api/health`, retornando informações sobre o status atual da aplicação, provedores de serviço configurados, uptime, versão de API e lista de features habilitadas. Esta rota é pública (não requer autenticação) e serve tanto para monitoramento quanto para validar que a API está operacional antes do frontend tentar fazer login.

Todos os dados trocados são representados como JSON. Requisições que enviam dados (POST, PATCH) incluem header `Content-Type: application/json` e corpo contendo objeto JSON. Respostas incluem header `Content-Type: application/json` e corpo contendo objeto JSON. Não há suporte para XML, FormData, ou outros formatos; JSON é o único formato de troca.

### Autenticação — JWT Bearer Token

A autenticação no FlexBen baseia-se em JWT (JSON Web Tokens), um padrão aberto para criar tokens assinados que podem ser verificados sem consultar um servidor central de autenticação. A autenticação ocorre inicialmente através de login com email/senha ou Google, retornando um JWT que é armazenado no cliente e enviado em todas as requisições subsequentes.

O fluxo de login começa com `POST /api/auth/login` ou `POST /api/auth/google`, fornecendo credenciais (email/senha para login tradicional, ID token Google para OAuth). Se validado com sucesso, o servidor responde com um JWT e informações do usuário. O JWT é um string contendo três partes separadas por pontos: header (algoritmo de hash), payload (dados do token) e assinatura (hash do header+payload com chave secreta do servidor).

O payload do JWT contém campos essenciais: `id` (identificador do usuário no banco), `email` (email do usuário), `role` (papel do usuário: colaborador, gestor, admin, financeiro), `iat` (issued at — timestamp de quando foi criado), `exp` (expiration — timestamp de quando expira). Em todas as requisições autenticadas, o cliente envia o JWT no header `Authorization: Bearer {token}`. O servidor valida a assinatura do JWT usando a chave secreta (`JWT_SECRET`), verifica se não expirou, e então confia nas informações dentro dele.

A duração de validade é 12 horas. Após 12 horas, o token expira e o cliente recebe erro 401 Unauthorized em qualquer requisição subsequente. Para continuar autenticado, o cliente deve fazer login novamente. Esta expiração balanceia segurança (limita janela se token for comprometido) com conveniência (12 horas é suficiente para sessão de trabalho típica).

### Códigos de Status HTTP

A API utiliza codes HTTP padrão para comunicar o resultado de cada operação. `200 OK` indica sucesso em requisições GET ou PATCH que não criam novo recurso. `201 Created` indica sucesso em requisições POST que criam novo recurso — o header `Location` pode incluir URL do novo recurso e corpo contém o objeto criado. `204 No Content` indica sucesso em requisições DELETE — nenhum corpo é retornado, apenas headers.

Para erros do cliente (requisição inválida, falta de permissão, recurso não encontrado), códigos 4xx são retornados. `400 Bad Request` indica validação falhou (campo obrigatório ausente, valor inválido). `401 Unauthorized` indica autenticação falhou ou token expirou — cliente deve fazer login novamente. `403 Forbidden` indica autenticação bem-sucedida mas autorização falhou — usuário não tem permissão para aquele recurso (ex: colaborador tentando acessar rota admin). `404 Not Found` indica recurso não existe (ex: transação com ID 999 não encontrada). `409 Conflict` indica operação não pode ser completada devido a conflito (ex: tentativa de registrar email que já existe).

Para erros do servidor (falha interna, bug, indisponibilidade), código `500 Internal Server Error` é retornado. O cliente não pode resolver erro 500; apenas o desenvolvedor pode investigar logs do servidor. Por isso, erro 500 nunca expõe detalhes técnicos como stack trace — apenas mensagem genérica.

### Padrão Consistente de Resposta

Todas as respostas da API seguem uma estrutura previsível. Respostas bem-sucedidas contêm objeto JSON com campos nomeados explicitamente indicando tipo de dado. Não há "resposta genérica com um array anônimo"; sempre há estrutura clara.

Por exemplo, login bem-sucedido retorna `{ "token": "...", "user": {...} }`. Listagem de transações retorna `{ "transactions": [...], "balances": [...] }`. Criação de categoria retorna `{ "category": {...} }`. Deleção não retorna corpo (204 No Content). Erros sempre retornam `{ "message": "descrição legível" }`.

Esta consistência permite que frontend desenvolva cliente HTTP genérico que pode trabalhar com qualquer endpoint. Não há surpresas; a estrutura de resposta é sempre previsível.

### Autenticação e Autorização — Middleware

Todas as rotas que requerem autenticação usam middleware `authRequired`, que verifica se header `Authorization: Bearer {token}` está presente, valida a assinatura do JWT, e verifica se não expirou. Se validação falhar, retorna 401 Unauthorized. Se suceder, anexa informações do usuário (`req.auth = {id, email, role}`) ao objeto request para uso pelos handlers.

Rotas que requerem papel específico (ex: apenas admin) usam middleware `roleRequired(['administrador'])`. Este middleware primeiro aplica `authRequired` (garantindo que usuário está autenticado), depois verifica se `req.auth.role` está em lista permitida. Se não, retorna 403 Forbidden com mensagem indicando que acesso é restrito àquele papel.

### Recursos Principais e Endpoints

A API oferece endpoints organizados por domínio funcional. O domínio de autenticação inclui login tradicional e Google, recuperação de senha, obtenção de dados do usuário autenticado, atualização de perfil e senha. O domínio de usuários (admin only) permite listar, criar, e gerenciar status de usuários. O domínio de categorias permite listar categorias (autenticado) e criar/deletar (admin).

O domínio de transações é mais rico. Permite listar transações (próprias ou todas se admin), deletar transação, ver histórico de workflow de uma transação. Permite também registrar realocação de crédito entre categorias, registrar utilização (saída) de crédito, criar propostas de teto de benefício, e tomar decisões em propostas.

O domínio de aprovações gerenciais (gestor/admin) permite ver fila de aprovações pendentes, ver métricas de SLA de aprovação, e tomar decisão (aprovar/rejeitar) em uma solicitação específica.

O domínio de carga mensal (admin) permite gerar prévia de carga que será executada, e executar a carga de crédito mensal para todos os colaboradores ativos.

O domínio financeiro permite ver resumo do fechamento, executar o fechamento de período, e exportar dados para análise em formatos como CSV.

O domínio de auditoria (admin) retorna últimos eventos de auditoria para rastreabilidade.

O domínio de notificações permite que usuário liste suas notificações não-lidas, marque como lida, ou marque todas como lidas.

### Exemplo Prático — Realocar Crédito

Um colaborador deseja realocar R$ 100,50 de sua categoria Alimentação para Mobilidade. O frontend faz uma requisição:

```
POST /api/reallocations
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "fromCategory": "Alimentação",
  "toCategory": "Mobilidade",
  "valor": 100.50,
  "descricao": "Necessidade de transporte este mês",
  "costCenter": "*"
}
```

O backend recebe a requisição, valida token JWT no header, confirma que usuário está autenticado. Verifica que `fromCategory` e `toCategory` são diferentes, que `valor` é positivo, que categorias existem no banco, que usuário tem saldo suficiente em Alimentação. Se todas as validações passam, cria dois registros de transação no banco — um de saída em Alimentação e um de entrada em Mobilidade — com mesmo valor, usuário, data, status. Ambos recebem eventos de workflow indicando criação.

Se realocação for criada por financeiro (não o próprio usuário), exige aprovação do gestor — transactions iniciam em status "Em análise" e uma notificação é publicada para o gestor. Se criada pelo próprio usuário ou por admin, pode ser auto-completada e status fica "Concluída".

O backend retorna resposta 201 Created:

```json
{
  "debit": {
    "id": 42,
    "userEmail": "joao.silva@empresa.com",
    "data": "16/06/2026",
    "tipo": "Saída",
    "categoria": "Alimentação",
    "valor": 100.50,
    "status": "Concluída",
    "descricao": "Realocação para Mobilidade — Necessidade de transporte este mês"
  },
  "credit": {
    "id": 43,
    "userEmail": "joao.silva@empresa.com",
    "data": "16/06/2026",
    "tipo": "Entrada",
    "categoria": "Mobilidade",
    "valor": 100.50,
    "status": "Concluída",
    "descricao": "Realocação de Alimentação — Necessidade de transporte este mês"
  },
  "needsApproval": false
}
```

Front-end recebe e atualiza UI para refletir nova realocação, mostrando saldos atualizados. Se `needsApproval` fosse true, exibiria mensagem ao usuário informando que realocação está pendente aprovação.

### Tratamento de Erros — Casos Comuns

Se usuário fornece valor zero ou negativo, backend responde com 400 Bad Request e mensagem "Informe categorias de origem/destino e valor válido." Se usuário não tem saldo suficiente em origem, responde com 400 e mensagem específica mostrando saldo disponível. Se categorias fornecidas não existem ou estão inativas, responde com 404 "Categoria não encontrada" ou "Categoria inválida ou inativa".

Se cliente não envia token JWT, backend responde com 401 "Token ausente". Se token está expirado ou assinatura inválida, responde com 401 "Token inválido ou expirado". Se collaborador sem permissão tenta criar realocação para outro usuário, backend responde com 403 "Sem permissão para realocar em nome de outro colaborador".

Se banco de dados retorna erro de duplicação de chave (ex: email já existe), backend converte para 409 Conflict com mensagem "Registro duplicado". Se avatar enviado é muito grande, 413 "Arquivo muito grande; o app comprime fotos automaticamente." Se erro inesperado ocorre no servidor, 500 "Erro interno no servidor" sem expor detalhes técnicos.

### Versionamento e Evolução de API

A API está atualmente na versão 2.1, refletida no campo `apiVersion` retornado por `/api/health`. Versões anteriores adicionaram features incrementalmente: v1.0 com transações e workflow, v1.1 com tetos de benefício, v1.2 com notificações, v2.0 com redesign arquitetural, v2.1 com suporte a créditos.

A API foi desenhada para ser extensível sem quebrar clientes existentes. Novos campos adicionados a respostas não quebram clientes JSON (JSON é agnóstico sobre campos adicionais). Novos endpoints podem ser adicionados. Campos que são removidos fariam quebrar clientes dependentes, então são evitados; em vez disso, campos são deprecados.

---

**Documentação Técnica Completa — Seções 5.2.6 a 5.2.9**

Última atualização: junho/2026.
