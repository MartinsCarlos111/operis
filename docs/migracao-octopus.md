# Plano de Migração — Octopus (C#/.NET) → Operis (Node/TypeScript)

> Repositório legado: `OPERISS/development/Visao4D/octopus` (26 projetos C#, ~936 arquivos `.cs`).
> Repositório alvo: `operis/` (Node 22, Fastify v5, Prisma 6 / PostgreSQL, zod, vitest, monólito modular em DDD).
> Este documento vive em `operis/docs/migracao-octopus.md` e é a fonte única de verdade para a migração.

---

## 1. Resumo executivo

O **Octopus** é uma solução N-tier clássica em C#: `Util → Modelo/Contracts → AcessoBanco (Dapper + SQL Server) → RegraNegocio → octopus-service (ASP.NET Core 6) + WebService (SOAP ASMX) + serviços Windows (calc/integração/terminais) + notification (SignalR)` + UI desktop + instaladores MSI. Configuração criptografada em `Config/parametros.xml`, lida por `Octopus.Util/Factories/ParametrosXmlFactory.cs` + `octopus.criptografia_xml/`. Dois bancos SQL Server físicos: **PRINCIPAL** e **MANUFATURA**.

O **Operis** é Node 22 / TypeScript ESM, Fastify v5, Prisma 6 (PostgreSQL), zod, monólito modular DDD (`src/modules/<modulo>/{application,domain,infrastructure}` + `src/shared/`). Multi-tenant por **banco isolado por tenant** (`TenantDatabase`, senha AES-256-GCM com `databaseEncryptionVersion`). Seed já provê bootstrap de `Matriz`, nível `Administrador`, `admin@operis.local` e `suporte@operis.local` (ver `prisma/seed.ts:110`). Módulos já iniciados: `estabelecimentos`, `usuarios`, `operis_control`.

**Migra o backend de negócio + API. Não migra:** UI desktop (`Octopus.UI`, `Octopus.UI.Old`), instaladores/Setup (`Octopus.Setup`, `octopus.installer*`, `Octopus.Console`), hosts IIS/Windows Service, biometria NITGEN nativa (tratada como gateway externo), DLLs `External/`.

---

## 2. Equivalência de stack

| C# / .NET (origem) | Node / TS (alvo) |
|---|---|
| ASP.NET Core Controllers (`octopus-service/Controllers/**`) | rotas Fastify (`infrastructure/http/*.routes.ts`) |
| Dapper + SQL Scripts (`Octopus.AcessoBanco/**`) | Prisma Client (`@prisma/client`) + `prisma/schema.prisma` |
| SQL Server (bancos PRINCIPAL + MANUFATURA) | PostgreSQL (schemas `principal` / `manufatura` em um DB por tenant) |
| `Fachada` God-object (`Octopus.AcessoBanco/Fachada.cs`, `Octopus.RegraNegocio/Fachada.cs`) | use-cases em `application/use-cases/` |
| DAO por entidade (`Octopus.AcessoBanco/{Principal,Manufatura}/*DAO.cs`) | `prisma-<entidade>.repository.ts` + `<entidade>.mapper.ts` |
| Modelo (entidades/DTOs) (`Octopus.Modelo/**`) | `domain/entities/` + `application/dtos/` |
| Enumerators (~64 enums em `Octopus.Modelo/*/Enumerators/`) | zod enums + TS unions |
| `Octopus.Contracts/Interfaces/*` | Port interfaces em `domain/repositories/*.repository.ts` |
| Newtonsoft.Json | JSON nativo + zod |
| JwtBearer | `@fastify/jwt` |
| Swashbuckle | `@fastify/swagger` + `@fastify/swagger-ui` |
| SignalR (`octopus-notification/Hubs/`) | `ws` ou Socket.IO (serviço dedicado `operis-realtime`) |
| RabbitMQ.Client | `amqplib` (ou BullMQ + Redis) |
| ClosedXML / MiniExcel | `exceljs` |
| MailKit / MimeKit | `nodemailer` |
| Serilog (+ `CustomSqlServerSink.cs`) | `pino` (+ transporte pino-pg opcional) |
| BouncyCastle + `Octopus.Util/Security/Crypt.cs` + `octopus.criptografia_xml/` | `node:crypto` AES-256-GCM (alinha com `TenantDatabase.databaseEncryptionVersion`) |
| Active Directory (`System.DirectoryServices.AccountManagement`) | `ldapts` (se SSO corporativo necessário) ou JWT-only |
| WCF SOAP clients (`System.ServiceModel.*`) | `strong-soap` + `xml2js` em adapter isolado |
| `System.Web.Services` SOAP ASMX (`Octopus.WebService/WebService.cs`) | adapter SOAP legado temporário (decesso planejado) |
| `Microsoft.Web.Administration` / `System.ServiceProcess` | não migra (Docker / systemd / PM2) |
| iTextSharp (PDF) | `pdfkit` ou `puppeteer` |
| `Microsoft.Data.Schema.ScriptDom` (parser SQL, raro) | `node-sql-parser` (somente se `Octopus.Sha.ScriptManager` sobreviver) |
| Svg.dll | `sharp` / `@resvg/resvg-js` |
| NBioBSP / NITGEN (`External/NBioBSP.dll`, `FingerScan.cs`) | gateway Windows externo `operis-bio-bridge` expondo REST |
| Instaladores MSI (`octopus.installer*`, `Octopus.Setup`, `Octopus.Console`) | Docker / docker-compose + release pipeline |

---

## 3. Mapa de projetos C# → destino no Operis

| Projeto C# | Destino no operis | Tratamento |
|---|---|---|
| `Octopus.Util/` | `src/shared/**` | disperdi em `shared/{errors,infra,domain}` + helpers TS |
| `Octopus.Util/Factories/ParametrosXmlFactory.cs` | `src/shared/infra/config/env.ts` | `.env` + zod env schema substitui `Config/parametros.xml` |
| `Octopus.Util/Security/Crypt.cs` | `src/shared/infra/crypto/**` | AES-256-GCM (alinha com `TenantDatabase` já existente) |
| `Octopus.Modelo/` | módulos `domain/entities/` | UF por entidade |
| `Octopus.ModeloTerminal/` | módulo `terminais/domain/` | |
| `Octopus.Contracts/` | Port interfaces (`domain/repositories/*.repository.ts`) | interfaces viram portas |
| `Octopus.AcessoBanco/` | `infrastructure/persistence/` (Prisma repos) | renomeia DAO→Repository; `Fachada.cs` não migra |
| `Octopus.AcessoBanco/SQLUtil.cs`, `DAOHelper.cs` | `prisma/schema.prisma` + migrations | converte T-SQL → PL/pgSQL |
| `Octopus.RegraNegocio/` | `application/use-cases/` + domain services | quebra `Fachada.cs` (God-class) por use-case |
| `Octopus.WebService/` (SOAP ASMX) | adapter SOAP legado temporário | planejar decesso |
| `octopus-service/` (ASP.NET Core) | rotas Fastify em cada módulo | Controllers → `*.routes.ts` |
| `octopus-notification/` (SignalR) | serviço dedicado Node (`operis-realtime`) | mantém separado do HTTP API |
| `Octopus.Sha.NotificationAPI/` + `Octopus.NotificationAPI.Gateway/` | consolida no serviço de notificação | |
| `octopus.sha.wsIntegracao/` + `octopus.man.wsterminais/` | `integracoes/infrastructure/soap-clients/` | adapters |
| `octopus.man.service_integracao/` + `octopus.man.service_calc/` | workers Node (BullMQ) | reescreve como jobs |
| `Octopus.Sha.Servico/` | shared services | dispersa |
| `Octopus.Sha.ScriptManager/` | `src/shared/infra/sql-runner/` | reescreve apenas se necessário |
| `Octopus.Login/` | módulo `autenticacao` | rewrite com `@fastify/jwt` |
| `Octopus.Console/`, `Octopus.Setup/`, `octopus.installer*`, `octopus.criptografia_xml/` (instalador) | **não migra** | substituir por Docker/scripts |
| `Octopus.UI/`, `Octopus.UI.Old/` | `operis-front/` (web) | não migra |
| `External/` (DLLs Win32) | **não migra** | ver biome gateway acima |

---

## 4. Padrão modular de referência

Já materializado em `src/modules/estabelecimentos/`. Replicar para cada módulo migrado:

```
src/modules/<modulo>/
├── <modulo>.module.ts                      # registra rotas + DI
├── application/
│   ├── dtos/<entidade>.dto.ts               # zod schemas (entrada/saída)
│   └── use-cases/<verbo>-<entidade>.use-case.ts
├── domain/
│   ├── entities/<entidade>.ts               # entidade rica (sem Prisma)
│   ├── value-objects/...                    # ex.: ChavePermissao
│   ├── exceptions/*.error.ts                # herda de AppError (shared/errors/app-error.ts)
│   └── repositories/<entidade>.repository.ts # Port (interface)
└── infrastructure/
    ├── http/<entidade>.routes.ts            # Fastify + fastify-type-provider-zod
    └── persistence/
        ├── prisma-<entidade>.repository.ts  # Adapter (Prisma)
        └── <entidade>.mapper.ts             # Prisma row ↔ domain entity
```

**Regras de ouro:**

- Nada de `Fachada`. Cada use-case recebe um `Repository` injetado (Port do domínio), nunca `PrismaClient` direto.
- O mapper isola o Prisma do domínio (nada de tipos Prisma em `domain/`).
- Multi-tenant via `src/shared/tenant-runtime/prisma-factory.ts`: o use-case pega o cliente Prisma do tenant corrente.
- Cada módulo é uma ileha navegável — `dependency-cruiser` com regras proibindo dependências `manufatura → principal` (exceto shared).

---

## 5. Decomposição do domínio em módulos target

Derivada dos controllers em `octopus-service/Controllers/`:

### Principal
| Módulo target | Origem (controllers/RNs/DAOs) | Status |
|---|---|---|
| `estabelecimentos` | `EstabelecimentoController`, `EstabelecimentoRN/DAO`, `EstabelecimentoImpressora`, `EstabelecimentoConsulta` | ✅ em andamento — `EstabelecimentoImpressoraController` migrado como módulo `estabelecimento_impressoras` (vínculo N:N estab↔impressora, PK composta; regras do RN; 7 testes). Pendente: EstabelecimentoConsulta, export/import. |
| `usuarios` | `UsuarioController`, `UsuarioRN/DAO`, `CrachaRN`, `NivelAcessoRN`, `NivelAcessoRestricaoRN` | ✅ em andamento — `CrachaController` migrado como módulo `crachas` (CRUD código/nome/status; 7 testes). **Biometria: só a tabela `CrachaBiometria` existe — NÃO é funcional** (sem enroll/cifragem/match/gateway); detalhes e roadmap na §6.14. Pendente: biometria funcional, export/import. |
| `operis_control` | Control Plane (Tenant, TenantDatabase, SuperAdmin) | ✅ em andamento |
| `autenticacao` | `LoginController`, `Octopus.Login/`, `AuthHeader` (SOAP) | **novo** |
| `areas` | `AreaController`, `AreaUsuarioRN/DAO` | ✅ CRUD migrado (piloto: schema Area+AreaUsuario, use-cases c/ regras do AreaRN, rotas c/ `autorizar('areas:*')`, 11 testes). `AreaUsuarioController` migrado como módulo `area_usuarios` (vínculo N:N usuário↔área, regras do AreaUsuarioRN, 7 testes). Pendente: export/import XLSX, `GetConfiguracaoCampos`, GETs auxiliares (`GetAreasRelacionadas`, `GetEnumAreas`) |
| `niveis-acesso` | `NivelAcessoController` (permissões já em estabelecimentos — revisar) | parcial |
| `configuracoes` | `ConfigController`, `ConfigCamposRN`, `ConfiguracaoRN`, `VariavelLayoutRN` | ⏸️ ADIADO (arquitetura já definida — ver abaixo). Não é CRUD: é key-value store (42 chaves em `EnumConfiguracaoGlobal`). **Decisão: NADA vai para `.env`.** As configs de infra são config **por-tenant do Control Plane** (padrão `TenantDatabase`), não infra de deploy. Divisão em dois planos + tabelas tipadas por grupo — detalhe na §6.13. |
| `impressoras` | `ImpressoraController`, `LayoutEtiquetaRN` | ✅ CRUD migrado (Impressora GLOBAL do tenant: codigo/descricao/endereco únicos; use-cases c/ regras do ImpressoraRN; rotas c/ `autorizar('impressoras:*')`; 7 testes). Vínculo N:N migrado como `estabelecimento_impressoras` (7 testes). Pendente: export/import XLSX, `GetConfiguracaoCampos` |
| `layouts` | `VariavelLayoutController`, `LayoutEtiquetaController`, `VariavelLayoutRN`, `LayoutEtiquetaRN` | ✅ CRUD migrado — módulo `layouts` com 2 agregados: VariavelLayout (codigo/descricao/campos etiqueta) + LayoutEtiqueta (codigo/descricao/zpl). Globais do tenant, `autorizar('layouts:*')`, 3 testes (CRUD dos dois). Pendente: `GetConfiguracaoCamposEtiquetaManufatura` (metadados de tela) |
| `erros-logs` | `LogSistemaController`, `ErroRN/DAO` | ⏸️ ADIADO. `LogSistemaController` NÃO usa banco — lista/baixa arquivos `.txt` do Serilog em disco (pasta de instalação Windows), filtrando por nome. Sem paridade útil no operis, que usa `pino` (stdout/estruturado). Tratar como observabilidade (pino+OTel, §6.9/Fase 5), não como CRUD. `ErroRN/DAO` (log em tabela via CustomSqlServerSink) pode virar feature nova se houver demanda. |
| `notificacoes` | `NotificationController`, `NotificacaoRN`, `RegraNotificacao`, `CondicaoNotificacao` | ✅ CADASTRO migrado (RegraNotificacao + CondicaoNotificacao 1:N com cascade; use-cases c/ regras do RegraNotificacaoRN; rotas c/ `autorizar('notificacoes:*')`; 8 testes). FORA do escopo (a migrar depois): motor de disparo (`ListIdRegistroParaNotificacao`, SQL dinâmico), `ConsultaNotificacaoController` (leitura de disparadas), realtime/SignalR (→ operis-realtime, §6.7), export/import XLSX |
| `menu-dashboard` | `MenuController`, `DashboardController`, `SobreController` | **novo** |

### Manufatura
| Módulo target | Origem (controllers/RNs/DAOs) | Status |
|---|---|---|
| `manufatura/calendario` | `CalendarioController`, `CalendarioRN` | **novo** |
| `manufatura/centro-trabalho` | `CentroTrabalho*` (CT, Área, Ferramenta, Online, Item) | **novo** |
| `manufatura/ordem-producao` | `OrdemProducaoController`, `OPFerramenta`, `OPHistorico`, `PlanoProducao` | **novo** |
| `manufatura/movimentos` | `MovimentoController`, `MovimentosHistorico`, `MovimentosFerramenta`, `Reserva`, `ReservaHistorico` | **novo** |
| `manufatura/ferramentas` | `FerramentaController`, `FerramentaRN`, `GrupoMaquinaRN` | **novo** |
| `manufatura/itens` | `ItemController`, `QualidadeItem` | **novo** |
| `manufatura/tipos` | `TipoCausa`/`TipoParada`/`TipoRecusa`/`TipoRefugo` + respectivos `*Area` | **novo** |
| `manufatura/terminais` | `TerminaisController`, `TerminaisDAO`, `ModeloTerminal` | **novo** |
| `manufatura/iot` | `IOT`, `CentroTrabalhoIOT`, `ConfigIOT`, `IndicadoresIOT`, `IndicadoresOnline` | **novo** |
| `manufatura/indicadores` | `CalculoIndicadores`, `MovimentosCalculoIndicadores`, `DisponivelProduzindoParada`, `AcompanhamentoProducao` | **novo** (rego crítico — ver SPs) |
| `manufatura/etiquetas` | `EtiquetaManufatura`, `RelatorioEtiquetas`, `Reportagem` | **novo** |
| `manufatura/diario-bordo` | `DiarioDeBordoRN/DAO` | **novo** |

### Integrações / Realtime
| Módulo target | Origem | Status |
|---|---|---|
| `integracoes` | `Sha.WsIntegracao`, `Man.WsTerminais`, `Man.ServiceIntegracao`, `Man.ServiceCalc` | **novo** (adapters + workers) |
| `operis-realtime` (serviço separado) | `octopus-notification/Hubs/` (SignalR) | **novo** |

---

## 6. Decisões técnicas específicas

### 6.1 Banco de dados — SQL Server → PostgreSQL
- **Dois bancos físicos** (PRINCIPAL + MANUFATURA) → **um PostgreSQL com duas áreas de tabelas** (`principal.*` e `manufatura.*`) dentro do schema único `prisma/schema.prisma`. Multi-tenant já existe em `operis` via `TenantDatabase`: cada tenant recebe seu próprio Postgres com esse schema replicado por migration.
- Converter `Config/SQLServer_Scripts/*.sql` para Prisma migrations. **Manual crítico** para: `MERGE`, `OUTPUT`, `WITH (NOLOCK)`, `DATETIME2`, `BIT`, `IDENTITY`, `GETDATE()`, `ISNULL`, `CONVERT`, triggers, stored procedures.
- Apoio: `pgloader` para migração inicial de dados; DDL reescrita manualmente.
- Stored procedures → **reavaliar**: mover lógica para use-cases TS; reter como functions PG apenas onde há ganho de performance comprovado (ex.: cálculo de indicadores em volume).

### 6.2 Acesso a dados — Dapper → Prisma
- `DAOHelper` + `Fachada` desaparecem. Cada `DAO` → `prisma-<entidade>.repository.ts` implementando `domain/repositories/<entidade>.repository.ts`.
- Transações por base separada (`BeginTransactionPrincipal/Manufatura`) → `prisma.$transaction()` por tenant. Para cross-área (raro), mesma conexão Postgres atômica.
- SQL cru complexo em relatórios → `Prisma.$queryRaw` com `Prisma.sql`, apenas em `infrastructure/persistence/`.

### 6.3 Enums
- `Octopus.Modelo/{Principal,Manufatura}/Enumerators/` (~64 enums) → `zod` enums + union types TS em `domain/value-objects/` ou `domain/enums.ts`. Ex.: `EnumStatusOrdemProducao.cs` → `schemaStatusOrdemProducao = z.enum([...])`.

### 6.4 Regra de negócio — Quebra da Fachada
- `Octopus.RegraNegocio/Fachada.cs` (God-class) **não traduz literal**. Cada método → um use-case único com DTO de entrada/saída. Exemplos:
  - `Fachada.AdicionarEstabelecimento(Estabelecimento)` → `application/use-cases/criar-estabelecimento.use-case.ts` (já existe).
  - `Fachada.ListarUsuarios(cdEstab)` → `listar-usuarios.use-case.ts`.
- Factories (`CentroTrabalhoOnlineFactory`, `MovimentoFactory`, `OrdemProducaoFactory`, `EtiquetaManufaturaFactory`) → domain services em `domain/services/`.

### 6.5 Autenticação
- `JwtBearer` do octopus-service + `Octopus.Login/` (AD) + `AuthHeader` SOAP. Para `operis`:
  - **Padrão**: `@fastify/jwt`, login local (`TenantAdministrador`, `SuperAdmin`) + login de usuário-tenant via `tenant-runtime`.
  - **AD/LDAP**: se necessário, use-case `login-ldap` com `ldapts`; caso contrário, descontinuar AD.
  - **SOAP `AuthHeader`** (terminais antigos): adapter mantém o header durante o cutover; substituído gradualmente por JWT.
- Seed já provê `admin@operis.local` (tenant) e `suporte@operis.local` (Control Plane) — ver `prisma/seed.ts:86` e `prisma/seed.ts:110`. Em produção, `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_SENHA` vêm do ambiente.

### 6.6 SOAP / WCF (terminais antigos)
- `Octopus.WebService/WebService.cs` (ASMX SOAP) e `Sha.WsIntegracao` / `Man.WsTerminais` (WCF): expostos para terminais antigos. Estratégia:
  1. **Fase 1**: não migra — manter o C# rodando atrás de proxy reverso; `operis` só orquestra.
  2. **Fase 2**: adapter Node (`strong-soap`) lado cliente quando `operis` precisar chamar terminais legados — módulo `integracoes/infrastructure/soap-clients/`.
  3. **Fase 3**: decesso — substituir terminais SOAP por REST ou MQTT (IoT/manufatura já usa protocolos próprios).

### 6.7 Realtime — SignalR → Node
- `octopus-notification/Hubs/` → serviço dedicado Node usando **`ws`** (raw, leve) ou **Socket.IO** (se reconexão automática/fallback necessário). Serviço separado `operis-realtime`, isolado do HTTP API.

### 6.8 Mensageria + workers
- `RabbitMQ.Client` (octopus-service) + serviços Windows (`Man.ServiceCalc`, `Man.ServiceIntegracao`) → `amqplib` direto ou **BullMQ + Redis** (mais idiomático em Node). Para recálculo batch (ServiceCalc) um worker BullMQ separado.

### 6.9 Excel / Email / Logs
- `ClosedXML`/`MiniExcel` → `exceljs` (templates `*.xlsx`). Helper `src/shared/infra/excel`.
- `MailKit`/`MimeKit` → `nodemailer` (SMTP). Helper `src/shared/infra/mailer`.
- `Serilog` (+ `CustomSqlServerSink.cs`) → `pino` + `pino-pretty` em dev. Logs em PG via `pino-pg` ou escrita explícita (tabela `log_sistema` migra para `erros-logs`).

### 6.10 Configuração + segredos
- `Config/parametros.xml` (criptografado por `octopus.criptografia_xml/`) → **abandonar**, migrar para:
  - `.env` + zod env schema (`src/shared/infra/config/env.ts`). Já existe `.env.example` no repo.
  - Senhas de bancos dos tenants já cifradas em `TenantDatabase.databasePasswordEncrypted` (AES-256-GCM, versão em `databaseEncryptionVersion`). O `EncryptionService` (já existe) é contrapartida de `Octopus.Util/Security/Crypt.cs`.
  - Nomes IIS/AppPools/WindowsServices do XML → descartados (substituir por Docker / nomes de serviço).

### 6.11 DLLs `External/` (Windows-only)
| DLL | Substituto Node |
|---|---|
| iTextSharp | `pdfkit` / `puppeteer` |
| Svg.dll | `sharp` / `@resvg/resvg-js` |
| Microsoft.Data.Schema.ScriptDom | `node-sql-parser` (somente Sha.ScriptManager — raro) |
| Microsoft.Web.Administration | não migra |
| NBioBSP / NITGEN (biometria) | **gateway Windows dedicado** (`operis-bio-bridge`) mantém SDK e expõe API REST para `operis` |

### 6.12 Multi-tenant
- O modelo Octopus separa PRINCIPAL/MANUFATURA por *banco físico*. No `operis` o eixo multi-tenant é **banco por tenant** (`TenantDatabase`). Proposta:
  - Cada tenant recebe um Postgres com schemas `principal` + `manufatura` (mesma instância, isolamento lógico/schema) — alinhado ao `prisma/schema.prisma` único replicado por `TenantDatabase`.
  - Se um tenant legado ficar grande demais, migra para Postgres separado sem mudar o código do `operis` (`TenantDatabase.databaseHost` é parametrizável).

### 6.13 Configurações (`ConfiguracaoController`) — dois planos, nada no `.env`

O Octopus guarda **42 chaves** (`EnumConfiguracaoGlobal`) numa tabela key-value única (`Configuracao`: `dsConfiguracao`/`dsValor`/`idEstabelecimento?`/`codigoProduto?`/`senha`/`visivel`). Os 24 endpoints do controller são apenas get/set temáticos dessas chaves.

**Decisão de arquitetura:** o que parece "infra" (SMTP, RabbitMQ, ERP, AppServer) **não é infra de deploy** — num SaaS single-tenant-por-banco é **configuração por-tenant**, gerida pelo super-admin no painel `/admin`, exatamente como `TenantDatabase` já faz (senha cifrada por `EncryptionService` AES-256-GCM + `databaseEncryptionVersion`). Portanto **não se usa `.env`**; divide-se em dois planos:

- **Control Plane** (banco global, junto de `Tenant`/`TenantDatabase`, tela `/admin`): infra que o **provedor** configura para o cliente.
- **Data Plane** (banco do tenant, tela do tenant): regras que o **admin do tenant** ajusta; `🏢` = varia por estabelecimento (obriga Data Plane).

**Forma:** tabelas **tipadas por grupo** (não KV genérico) — colunas nomeadas/tipadas, senhas cifradas como em `TenantDatabase`. Ex.: `TenantSmtpConfig`, `TenantBrokerConfig`, `TenantErpConfig` no Control Plane. Nova config = migration (trade-off aceito por type-safety).

> ✅ **Implementado (jul/2026): RabbitMQ e SMTP.** Models `TenantRabbitMq` (host/porta/virtualHost/usuario/senha🔒/ssl) e `TenantSmtp` (host/porta/usuario/remetente/senha🔒/ssl), 1:1 com `Tenant`, cascade. Senha cifrada via `EncryptionService` (AES-256-GCM + `encryption_version`), **nunca** devolvida na resposta (DTO expõe só `senhaConfigurada: boolean`). Rotas sob `autenticarSuperAdmin`: `PUT/GET /admin/tenants/:id/rabbitmq` e `.../smtp` (PUT = upsert 1:1). Use-cases em `operis_control/application`. 8 testes de integração (cifragem verificada + senha ausente da resposta). Pendente dos demais grupos: AppServer ERP, URLs, tuning worker.

| Chave (`EnumConfiguracaoGlobal`) | Plano | Grupo/tabela sugerida |
|---|---|---|
| ServidorEmail, PortaEmail, UsuarioEmail, SenhaEmail🔒, UsaSSLEmail | Control Plane | `TenantSmtpConfig` |
| ENDERECO_BROKER, PORTA_BROKER, USUARIO_BROKER, SENHA_BROKER🔒, FILA_BROKER | Control Plane | `TenantBrokerConfig` |
| SERVIDOR_APPSERVER, USUARIO_APPSERVER, SENHA_APPSERVER🔒 | Control Plane | `TenantAppServerConfig` |
| SERVICE_NOTIFICACAO, WEBSERVICE_INTEGRACAO, CAMINHO_WEBSERVICE_TERMINAIS | Control Plane | `TenantIntegracaoUrls` |
| QUANTIDADE_MAXIMA_MOVIMENTOS_PACOTE_INTEGRACAO, QUANTIDADE_THREADS_INTEGRACAO, TEMPO_CORTE_INTEGRACAO, TIMEOUT_INTEGRACAO, INTERVALO_BUSCA_ORDENS_PRODUCAO_ERP, INTERVALO_ENVIO_MOVIMENTOS_EXECUTADOS_ERP | Control Plane | `TenantIntegracaoTuning` (tuning de worker) |
| ServidorAD, GerenciarSenhasAD | Control Plane ⏸️ | depende de SSO/AD (§6.5) |
| Contato, NomeFantasia, ResponsavelContato | Data Plane | `ConfiguracaoEmpresa` |
| DIAS_NOTIFICACAO, DIAS_HISTORICO | Data Plane | `ConfiguracaoRetencao` |
| CASAS_DECIMAIS🏢 | Data Plane | por estabelecimento |
| TIMEOUT_ONLINE, TIMEOUT_OFFILINE, IntervaloAtualizaMonitor, INTERVALO_LIBERACAO_ORDENS | Data Plane | `ConfiguracaoManufaturaMonitor` |
| USUARIO_ERP🏢, SENHA_ERP🔒🏢 | Data Plane | por estabelecimento (senha cifrada) |
| TIPO_INTEGRACAO, MODO_ENVIO_INTEGRACAO | Data Plane | `ConfiguracaoIntegracaoNegocio` |
| NOTIFICAR_QUEDA_INTEGRACAO, TEMPO_NOTIFICAR_QUEDA_INTEGRACAO, EMAIL_NOTIFICAR_QUEDA_INTEGRACAO | Data Plane | `ConfiguracaoNotificacaoIntegracao` |
| Outros🏢 | Data Plane | KV livre por estabelecimento (único caso KV) |

**Placar:** ~21 chaves → Control Plane; ~19 → Data Plane; 2 (AD) pendentes de SSO. Contrato de erro do C# (`200 { Ok:false }`) é substituído pelo padrão 4xx/5xx do operis (`error-handler`).

### 6.14 Biometria do crachá — estado atual e o que falta

> ⚠️ **A biometria NÃO está funcional.** O módulo `crachas` migrado é apenas o CRUD de código/nome/status. Só a *camada de armazenamento* de biometria existe; o fluxo real (enroll, cifragem, match, hardware) **não foi implementado** — por decisão (o processamento de digital é do gateway `operis-bio-bridge`, um serviço Windows à parte que ainda não existe).

**Contexto:** o `Cracha` do Octopus tem 10 colunas fixas de template de digital (`DedoPolegarEsquerdo`…`DedoMinimoDireito`) preenchidas pelo SDK NITGEN (`FingerScan.cs` + `External/NBioBSP.dll`). O leitor não guarda imagem — guarda um **template** (vetor de minúcias), opaco e específico do SDK. Autenticar = comparar template lido × templates cadastrados (o *match* é do SDK, não do banco).

**Modelagem escolhida (correta, mas só a fundação de dados):** as 10 colunas viraram a tabela filha **`CrachaBiometria` (1:N, cascade)** — `dedo` (enum `Dedo`, 10 valores), `templateCifrado`, `versaoCripto`, `formato` (SDK/padrão: NITGEN / ISO_19794_2 — permite trocar de leitor), `qualidade` Int?, `@@unique([crachaId, dedo])`.

**O que ESTÁ pronto (jul/2026):**
- ✅ Tabela `crachas_biometrias` no schema + migration aplicada.
- ✅ Teste de integração prova o *cascade* (grava uma digital via Prisma direto e confirma que excluir o crachá a remove).

**O que NÃO está pronto (tudo pendente):**
- ❌ Entity `CrachaBiometria` no domínio, repositório e use-cases (enroll / listar / remover digital).
- ❌ Rota de enroll (`POST /crachas/:id/biometrias` e afins) — não existe.
- ❌ **Cifragem real** do template: o campo se chama `templateCifrado` mas nada cifra ainda. Falta usar o `EncryptionService` (AES-256-GCM — o MESMO já usado em `TenantDatabase`) ao gravar. No teste, o valor foi gravado como texto puro (`'cifrado-fake'`).
- ❌ Match/autenticação por digital.
- ❌ Port `GatewayBiometria` + serviço `operis-bio-bridge` (REST no Windows com o SDK do leitor) — hoje é só nome em comentários.
- ❌ Integração com o hardware/SDK do leitor.

**Roadmap para tornar funcional:**
1. **Em Node puro (possível já):** entity + repositório + use-cases de `CrachaBiometria` (enroll/listar/remover) e **cifrar o template com o `EncryptionService`** ao salvar. Isso torna o *armazenamento* de biometria genuinamente funcional (cifrado em repouso — exigência LGPD para dado biométrico).
2. **Depende de hardware/SDK:** Port `GatewayBiometria` + `operis-bio-bridge` (serviço Windows separado, §6.11/§7) que faz enroll e match reais contra o leitor e devolve o template ao operis. O backend HTTP nunca processa biometria — só armazena/relê.

---

## 7. Riscos e atenção

| Risco | Severidade | Mitigação |
|---|---|---|
| T-SQL → PL/pgSQL em procedures/SQL cru de DAOs | **Alto** | inventariar SPs/triggers; SQL cru primeiro como `Prisma.$queryRaw`; conversão manual assistida |
| `Fachada` God-class — defeitos ocultos espalhados | Alto | cada RN migrado vira use-case testado em paridade (snapshot input/output) |
| Coexistência octopus-service ↔ operis (mesma base, mesmo tempo) | Alto | cutover por módulo via proxy; **modo shadow**: `operis` lê réplica Postgres enquanto octopus-service escreve em SQL Server (CDC/pgloader); cutover após paridade validada |
| SignalR → ws em clientes que dependem do protocolo | Médio | adapter de protocolo no serviço realtime ou manter SignalR legado vivo até substituição dos clientes |
| Terminais SOAP antigos sem ROM atualizável | Médio | adapter SOAP legado (não migrar de frente); rollout de firmware planejado |
| Biometria NITGEN (SDK Win32 + `FingerScan.cs`) | Médio | gateway externo `operis-bio-bridge` mantém SDK; `operis` consome REST |
| Stored procedures grandes de cálculo de indicadores | Médio | profiling; reescrever em TS (`manufatura/indicadores`) para iterar; reter como function PG só se houver perda de performance comprovada |
| Troca de Active Directory por JWT-only | Médio | checar dependência de SSO corporativo; se sim, integrar OIDC/SAML via `@fastify/passport` |
| `ModeloTerminal` (regras de hardware) | Médio | preservar em `manufatura/terminais` com testes de paridade |
| IIS/AppPool scaling ↔ cluster Node | Baixo | Kubernetes/PM2 ganha vertical; ajustar rate-limits |
| Licenças iTextSharp / ClosedXML (AGPL/LGPL) | Baixo | eliminar nos substitutos Node remove risco de licensing |

---

## 8. Estratégia de execução — Strangler Fig por módulo

Princípio: `operis` cresce módulo a módulo; octopus-service legado continua rodando; proxy reverso (nginx/Caddy) encaminha rotas migradas para `operis` e legadas para octopus-service. PostgreSQL em paralelo ao SQL Server legado com sincronização (snapshot + CDC ou `pgloader` + jobs periódicos) até o cutover do módulo.

### Fase 0 — Setup e fundação (2–3 sprints)
- Definir `src/shared/infra/config/env.ts` (zod) substituindo `parametros.xml`.
- Confirmar `EncryptionService` AES-256-GCM (par de `Crypt.cs`) com asserção de versão de chave.
- Padronizar helpers: `mailer` (`nodemailer`), `excel` (`exceljs`), `logger` (`pino`), `http client`, `soap client` (`strong-soap`).
- Realtime microservice scaffolding (`operis-realtime`, `ws`).
- Job runner (BullMQ + Redis) para workers de integração.

### Fase 1 — Domínio Principal (3–4 sprints)
Evitar pular para Manufatura. Ordem:
1. `usuarios`, `niveis-acesso`, `areas` (multi-tenant sincroniza com legado)
2. `configuracoes`, `impressoras`, `erros-logs`
3. `notificacoes` + realtime runtime
4. `menu-dashboard`, `autenticacao` (login JWT substitui `LoginController`)
- Cada módulo: paridade endpoint-a-endpoint via testes de snapshot no `vitest` + `testcontainers/postgresql`.

### Fase 2 — Manufatura (6–8 sprints)
1. `manufatura/calendario` + `manufatura/tipos` (fundação)
2. `manufatura/centro-trabalho` + `manufatura/ferramentas`
3. `manufatura/itens` + `manufatura/terminais`
4. `manufatura/ordem-producao` + `manufatura/movimentos` (maiores)
5. `manufatura/etiquetas` + `manufatura/diario-bordo`
6. `manufatura/iot` + `manufatura/indicadores` (cálculo mais crítico — revisar SPs primeiro)
- Em `indicadores`, priorizar reescrita como use-cases TS puros (perf set-based com Prisma + verificação) antes de reter como functions PG.

### Fase 3 — Integrações (3–4 sprints)
- `integracoes/infrastructure/soap-clients/` (terminais legados)
- Workers (calc/integração) migrados para BullMQ
- Desligar `Sha.WsIntegracao` / `Man.WsTerminais` / `Man.Service*` após validar paridade.

### Fase 4 — Cutover e decesso (2 sprints)
- Snapshot final SQL Server → Postgres; validar row-count + checksum.
- Proxy: última toggle — todas as rotas apontam para `operis`.
- Manter octopus-service offline em standby; remover após `N` dias sem rollback.
- Arquivar UI desktop, instaladores MSI (`Octopus.Setup`, `octopus.installer*`) e `octopus.criptografia_xml`.

### Fase 5 — Pós-migração
- Observabilidade: `pino` + OpenTelemetry.
- Migrar SPs restantes para TS.
- Regras `dependency-cruiser` restringindo dependências entre áreas `principal` / `manufatura`.
- Cobertura ≥ 80% nos módulos críticos.

---

## 9. Paridade e testes

- **Unit** (`vitest --project unit`): use-cases, domain services, mappers, value-objects.
- **Integration** (`vitest --project integration` com `@testcontainers/postgresql`): repositories, rotas Fastify injetadas (`fastify.inject()`), migrations Prisma reais.
- **Paridade por snapshot**: capturar ~30 requests reais do octopus-service por endpoint e comparar JSON normalizado no operis. Critério de aceite: mesma estrutura + mesmos valores numéricos (mesma casa decimal).
- **Property-based** (opcional): `fast-check` em indicadores.

---

## 10. Próximos passos imediatos

1. **Inventariar SQL**: enumerar todos os `*.sql` em `Config/SQLServer_Scripts/` e SQL embutido em `DAO/*.cs`; gerar tabela `entidade → SQL → origem.cs:linha`.
2. **Inventariar endpoints**: para cada controller em `octopus-service/Controllers/`, listar `(rota, verbo, DTO in/out)`. Output → backlog de rotas Fastify.
3. **Inventariar stored procedures**: lista de SPs/triggers, dono do negócio, decisão "mover para TS".
4. **Módulo piloto `areas`** (pequeno, ainda não migrado): provar o padrão DDD completo + paridade + proxy cutover.
5. **Definir ETL/CDC temporário** (SQL Server → Postgres) para modo shadow.
6. **Bloquear `Fachada`**: marcar como *deprecated* no C#; todo novo código de negócio só em `operis`.

---

## 11. Apêndice — Referências rápidas

### Legado (C#)
- Solução: `octopus.sha.sln`
- God-facade banco: `Octopus.AcessoBanco/Fachada.cs:913`
- God-facade regra: `Octopus.RegraNegocio/Fachada.cs`
- Base dos DAOs: `Octopus.AcessoBanco/DAOBase.cs:7`
- Config criptografada: `Config/parametros.xml:9`
- Crypto config: `Octopus.Util/Security/Crypt.cs`
- Controllers API: `octopus-service/Controllers/**`
- SOAP ASMX: `Octopus.WebService/WebService.cs:72`
- SignalR: `octopus-notification/Hubs/`
- Biometria SDK: `Octopus.Util/Security/FingerScan.cs` + `External/NBioBSP.dll`

### Alvo (operis)
- Schema Prisma: `prisma/schema.prisma:1`
- Seed bootstrap: `prisma/seed.ts:110` (`suporte@operis.local`)
- Módulo de referência: `src/modules/estabelecimentos/`
- Multi-tenant runtime: `src/shared/tenant-runtime/`
- Cripto de tenant: `model TenantDatabase` em `prisma/schema.prisma:179`
- Erro base: `src/shared/errors/app-error.ts`
- HTTP error handler: `src/shared/http/error-handler.ts`
- Swagger: `src/shared/http/swagger.ts`