# Comparativo de Regras de Negócio — Octopus (legado) × Operis (atual)

> Fonte legado: `development/Visao4D/octopus/` (C#/.NET, `Octopus.RegraNegocio/**`, `Fachada.cs`).
> Fonte atual: `operis/src/modules/` (Node/TS, DDD modular).
> Documento complementar ao `migracao-octopus.md` — foca apenas em **regras de negócio** (validações, cálculos, fluxos, integrações), não em stack/arquitetura.
> Convenção de status: ✅ migrado · 🟡 parcial · ❌ faltante · ➖ não se aplica (legado não tem).

---

## 1. Resumo executivo

O operis cobre bem o **cadastro transversal** (estabelecimentos, usuários, áreas, crachás, impressoras, layouts, notificações-cadastro, IoT-ingestão) e a **fundação** da manufatura (calendário, grupo de máquina, centro de trabalho, ordem de produção, artigos-ciclos). As **lacunas críticas** concentram-se em três blocos do legado ainda não migrados:

1. **Processos de manufatura em runtime** — movimentos, reservas, plano produção executivo, etiquetas, ferramentas, terminais/equipamentos.
2. **Monitoramento e indicadores em tempo real** — `CentroTrabalhoOnline`, OEE/TEEP/Disponibilidade/Performance/Qualidade, consumo de ferramenta, diário de bordo.
3. **Ciclo de vida de notificações** — motor de disparo (SQL dinâmico), fila de e-mails, SignalR/realtime, alertas de queda de integração.

Itens **não migrados por decisão** (documentados em `migracao-octopus.md`): UI desktop, instaladores, SOAP ASMX legado, biometria via SDK nativo (aguarda gateway `operis-bio-bridge`), Active Directory (JWT-only).

---

## 2. Placar por área funcional

| # | Área (legado) | Status | Observação principal |
|---|---|---|---|
| 1 | Estabelecimentos (CRUD + recursos) | ✅ | Inclusão do admin automático no novo estabelecimento; exclusão física proibida (soft-delete), divergência intencional. |
| 2 | Estabelecimento Impressoras (vínculo N:N) | ✅ | Paridade total do RN. |
| 3 | Estabelecimento Consultas | ❌ | Cadastro de "consultas associadas" não migrado. |
| 4 | Usuários (CRUD + recuperação senha) | 🟡 | CRUD/identidade OK; **recuperação de senha por e-mail** ❌; **MD5 → scrypt** (decisão: senha nunca migra em texto). |
| 5 | Login / Sessões | 🟡 | JWT-only; **AD/LDAP** ❌; **controle de sessão concorrente (aplicativo/portal)** ❌; **política de troca de senha no 1º login e expiração** ❌. |
| 6 | Crachás (CRUD) | ✅ | Código/nome/status; exclusão 404 explícita (divergência intencional). |
| 7 | Crachá Biometria | ❌ | Só camada de dados; sem enroll/cifragem/match/gateway. |
| 8 | Áreas + Área-Usuários | ✅ | Bloqueio de exclusão por usuários vinculados preservado. |
| 9 | Níveis de Acesso + Permissões (RBAC) | ✅ | Catálogo programático substitui `EnumAcessoTela`; resolução em runtime a cada request. |
| 10 | Impressoras (CRUD) | ✅ | Código único global no tenant. |
| 11 | Layouts (Variavel + Etiqueta ZPL) | ✅ | CRUD OK; **geração de etiqueta com substituição de coringas** ❌. |
| 12 | Notificações (cadastro de regras + condições) | ✅ | CRUD funcional. |
| 13 | Notificações (motor de disparo + fila de e-mail + realtime + alerta de queda integração) | ❌ | Tudo pendente. |
| 14 | Configurações globais (criadas catálogo) | 🟡 | `.env` + configs do tenant; **validação tipada por reflection** ainda parcial. |
| 15 | Configuração de Campos por tela | ✅ | Upsert tipado por tela via `ConfiguracaoCampos`. |
| 16 | IoT — Cadastro dispositivos + entradas | ✅ | `serial` = client_id MQTT; online derivado do broker. |
| 17 | IoT — Ingestão de leituras (worker AMQP) | ✅ | Descarte com motivo; deduplicação por `chaveEvento`; só `MOVIMENT` vira leitura. |
| 18 | IoT — Contadores por entrada configurada | ✅ | Janela default 24h/turno corrente. |
| 19 | Manufatura: Calendário / Grupo Máquina / Centro Trabalho | ✅ | RNs de forma preservados; Calendário obrigatório; bloqueio de exclusão em uso. |
| 20 | Manufatura: Artigos + Ciclos por CT (com import/export XLSX) | ✅ | DDD parcial (rotas direto no Prisma); import não derruba lote por linha inválida. |
| 21 | Manufatura: Ordem de Produção (cadastro/seed de status) | 🟡 | Criação + status default por `liberacaoEm` OK; **todo o ciclo de vida** (liberar/cancelar/devolver/baixar/reexecutar/reintegrar/histórico) ❌; **hierarquia pai/filha/irmã** ❌; **regras de despacho** ❌. |
| 22 | Manufatura: Movimentos | ❌ | Não migrado. |
| 23 | Manufatura: Reservas | ❌ | Não migrado. |
| 24 | Manufatura: Plano Produção (executivo + gerar ordem) | 🟡 | Cadastro existe como agregado; **conflito de data** e **gerar OrdemProducao a partir do plano** ❌. |
| 25 | Manufatura: Ferramentas + Consumo | ❌ | Não migrado. |
| 26 | Manufatura: Tipos (Parada/Refugo/Recusa/Causa + Áreas) | 🟡 | Cadastros existentes (parciais); **vínculos CT↔Tipo** ❌; **autocadastro vindo do terminal** ❌. |
| 27 | Manufatura: Equipamento/Terminal (12 botões, trocas automáticas) | ❌ | Não migrado. |
| 28 | Manufatura: Centro Trabalho Online (monitor de chão de fábrica) | ❌ | Não migrado. |
| 29 | Manufatura: Cálculo de Indicadores (OEE/TEEP/Disp/Perf/Qual) | ❌ | Não migrado. |
| 30 | Manufatura: Etiquetas (impressão Zebra) | ❌ | Não migrado. |
| 31 | Manufatura: Diário de Bordo | ❌ | Não migrado. |
| 32 | Históricos (ordens/movimentos/reservas) | ❌ | Não migrado. |
| 33 | Integração ERP (SOAP WS) | ❌ | Não migrado (adapter SOAP planejado). |
| 34 | Serviço de Notificações via SignalR | ❌ | Não migrado (`operis-realtime` planejado). |
| 35 | Serviço Windows de Integração/Calc | ❌ | Workers Node (BullMQ) planejados. |

**Placar final:** ✅ **12** · 🟡 **7** · ❌ **16** · ➖ 0.

---

## 3. Detalhamento por área — regras faltantes

### 3.1 Estabelecimentos ✅
Regras de `EstabelecimentoRN.cs` migradas: validação de código/descrição não-vazios; normalização empty→null; `DtAtualizacao=agora` no isValidar; bloqueio de duplicidade de `codigo`.

**❌ Faltantes:**
- **Contagem de relacionamentos cross-banco para bloqueio de exclusão** — legado chega dependências em **PRINCIPAL e MANUFATURA** simultaneamente antes de bloquear; operis só permite soft-delete. Risco: degenerar para "reativar depois de inativar" sem auditar dependências herdados do legado que tenham ficado órfãos na migração.
- **`EstabelecimentoConsulta`** (cadastro de consultas associadas ao estabelecimento) — não existe equivalente.
- **`AtualizarEstabelecimento` (upsert idempotente)** usado por sincronização — operis usa `criar`/`editar` explícitos;lógapode ser relevante para ferramentas de sincronização incremental.

### 3.2 Usuários / Login / Sessões 🟡
CRUD de `UsuarioRN.cs` migrado (paridade `ValidarUsuario`). RBAC em runtime substitui `EnumAcessoTela` + `[Permission]`.

**❌ Faltantes:**
- **`RecuperarSenha`** — fluxo completo (validar usuário+email, ler 5 configs globais de SMTP, descriptografar senha, gerar senha aleatória de 6 chars, gravar hash, enviar e-mail em SMTP). Incrementalmente: configuração SMTP por tenant já existe (cifra AES-GCM), use-case de recuperação não.
- **`EditarSenha` + `EditarPrimeiroLogin`** — troca autenticada de senha (exigir senha atual != nova, confirmação igual); flag de primeiro login; **expiração por `exigeMfa`/`expiracaoSenhaDias`/`maxTentativas`** do VO `PoliticasLogin` — modelado mas **sem executor** (ninguém bloqueia expiração nem conta tentativas).
- **Autenticação AD/LDAP** (`validouAD=true` bypassa checagem de senha) — decisão documentada: JWT-only por enquanto; reopenable se SSO corporativo demandado.
- **Sessão concorrente aplicativo vs portal**: regras de `SessaoRN.ChecarSessaoUsuario`:
  - `APLICATIVO`: permite múltiplas no mesmo `IdAplicacao`; bloqueia em outro app.
  - `PORTAL`: bloqueia login paralelo dentro de `PORTAL_SESSION_TIMEOUT`, retornando tempo restante.
  - O perceptível `SMART_CONNECT` (entre `onlineTimeOut` e `offlineTimeOut`) e a limpeza de sessões de terminais desconectados (`MatarConexoesAplicativoColetor`/`Portal`/`Terminal`).
- **Hash MD5 legado (sem salt) → scrypt** — operis decide **não migrar senhas em texto**: todos os admins redefinem via seed/SMTP. Esse decesso **não é uma lacuna**; documentar que migração de usuários exige reset de senha.
- **Bug do legado** em `AtualizarUsuario` (`DsSenha != DsSenha` sempre falso) **não deve ser preservado** — operis não precisa replicar.

### 3.3 Crachás / Biometria 🟡
CRUD de `CrachaRN.cs` migrado; `Cracha.Validar()` no domínio.

**❌ Faltantes (biometria):**
- Entity/repositório/use-cases de `CrachaBiometria` (enroll / listar / remover digital).
- **Cifragem real (AES-256-GCM via `EncryptionService`)** — campo `templateCifrado` hoje é gravado em texto nos testes. LGPD: dado biométrico exige cifra em repouso.
- Match/autenticação por digital (governado por `operis-bio-bridge` externo, fora do backend HTTP).
- Rota `POST /crachas/:id/biometrias`.

### 3.4 Áreas / Área-Usuários ✅
Paridade completa com `AreaRN.cs`/`AreaUsuarioRN.cs` (bloqueio de exclusão por usuários vinculados, vínculo com PK composta).

**❌ Faltantes:**
- **Checagem de relações em Manufatura** antes de excluir área (legado consultava dependências no banco MANUFATURA) — comentário de código reconhece a lacuna (pendente da migração daquele domínio).
- `GetAreasRelacionadas` / `GetEnumAreas` (GETs auxiliares de tela).
- Export/import XLSX.

### 3.5 Impressoras / Vínculo Estab-Impressora ✅
Paridade total do `ImpressoraRN.cs` e `EstabelecimentoImpressoraRN.cs` (validações, idempotência do vínculo, PK composta).

### 3.6 Layouts ✅🟡
CRUD de `LayoutEtiqueta` e `VariavelLayout` migrados (código único no tenant).

**❌ Faltantes:**
- **Substituição dinâmica de coringas no ZPL** (`EtiquetaManufaturaFactory.GerarEtiqueta`) — sem motor de template; fica pendente junto da migração de etiquetas.
- `GetConfiguracaoCamposEtiquetaManufatura` (metadados de tela).

### 3.7 Notificações 🟡
CRUD de `RegraNotificacao` + `CondicaoNotificacao` migrado (campos obrigatórios, validações do RN).

**❌ Faltantes (TODO grande):**
- **Motor de disparo-periodico** (`CriaNotificacao.cs`): avalia regras ativas periodicamente, monta SQL dinâmico a partir das condições, suporta tipos via reflection (.NET → TS), enums, DateTime, TimeSpan, bool (variantes "S"/"N"/"1"/"0"), gera token `regra_tabela_colunaId` para evitar duplicidade, substitui `@coringas` no conteúdo.
- **Fila de envio de e-mails** (`EnvioEmails.cs`): `DIAS_NOTIFICACAO` (cancela fila antiga), envia pendentes em loop via SMTP.
- **Envio SMTP via MailKit → `nodemailer`** com TLS e autenticação (configs do tenant já existem cifradas no Control Plane).
- **Realtime push** (SignalR `HubProvider`): broadcast de clientes online, chat, grupos, confirmação de recebimento (status 0/1/2), `ShowClientsOnLine`/`SendMessageToGroups`/`ReceiveMessageConfirm`, lifecycle on-connect/disconnect, limpeza de clientes sem conexão há > 1 dia.
- **Notificações de Queda de Integração ERP**: configs `NOTIFICAR_QUEDA_INTEGRACAO`, `EMAIL_NOTIFICAR_QUEDA_INTEGRACAO` (validação: nº de `@` == nº de emails separados por `;`), `TEMPO_NOTIFICAR_QUEDA_INTEGRACAO` (TimeSpan), HTML com função/erro/stacktrace/data, assunto "Octopus Manufatura – Divergência de Integração".
- **Status de notificação** (`PENDENTE_ENVIO`/`ENVIADA`/`CANCELADA`), `CancelarNotificacoes(dataLimite)`.
- **Anexos** (formato `caminho%idatividade`).

### 3.8 Configurações e Erros 🟡
`.env` + configurações por tenant (Control Plane) substituem `parametros.xml`.

**❌ Faltantes:**
- **Validação tipada de configuração global** (`ConfiguracaoRN.ValidarConfiguracao`): reflection legada cobria tipos (enum por nome/descrição, int com mínimo, TimeSpan hh:mm:ss, bool SIM/NAO/TRUE/FALSE/1/0), `UsoEstabelecimento` (obrigatório/não usa/opcional), `CampoSenha` (criptografa ao salvar). O operis tem zod env-schema, mas para **configurações tenant mutáveis por tela** ainda não há equivalente runtime.
- **`BuscarCasasDecimais(cdEstabelecimento, produto)`** com fallback global (default 2) — usado em formatação de quantidade/tempo.
- **`BuscarConfiguracaoIntervaloMonitor`** (intervalo de update do monitor, default 10s, >= 5) — relevante quando `CentroTrabalhoOnline` for migrado.
- **Módulo de Erros** (`ErroRN.cs`): `GravarErroFuncao/Movimento/Ordem`, `FinalizarErros*`, `ExcluirErrosCorteHistorico`, `EncerrarErro` — fundamental para integração/ERP e **ainda não existe** no operis (cadastro de erro ativo + finalização).

### 3.9 IoT ✅
**Migrado á frente do legado:**
- Cadastro de dispositivo/entrada/leitura com descarte-com-motivo (legado só gravava indicador "IOT conhecido").
- Worker AMPQ separado, fila durável `operis.iot.movimentos`, routing key `devices.#`, prefetch 20, reconexão 5s, nack sem requeue, deduplicação por `chaveEvento`.
- **Status online derivado do broker** (Management API), nunca persistido; degrada em silêncio para offline se broker cai.
- Contadores partem das **entradas configuradas** (porta sem pulso aparece zerada) — diferente do legado, onde o cálculo vinha das leituras.

**Diferenças intencionais (não faltantes):**
- Legado: `ConfigIOT` + `CentroTrabalhoIOT` (vínculo CT↔IoT por input). Operis: `DispositivoIot`/`EntradaIot`/`LeituraIot` — vínculo CT é via `contexto` da EntradaIot, não por relação direta. Decisão funcional; documentada.
- O antigo "Preset de IoT (nome único por input)" virou `label` da entrada (não tem unicidade por input separado do já único `[dispositivoId, input, tipo]`).

---

## 4. Manufatura — detalhamento das lacunas críticas

> O agregado manufatura está **parcialmente migrado** (cadastros base). Toda a **camada de processo/runtime** ainda falta. Esta é a área com maior Volume de RNs críticas do legado.

### 4.1 Ordem de Produção 🟡 (cadastro OK, ciclo ❌)
**Migrado:** validações de forma (`codigo`/`identificador`/`itemCodigo` obrigatórios, `quantidadePlanejada > 0`, `fimPlanejado >= inicioPlanejado`), defaults 999999, `origem` default `OCTOPUS`, `modoDistribuicao` default `PUXADA`, status default por `liberacaoEm` (futuro → `NAO_LIBERADA`), UNIQUE composto `[codigo, identificador]`.

**❌ Faltantes (validações do `ValidarOrdemProducao`):**
- Estabelecimento ativo + `ProdutoManufatura=true` (paridade existe para CentroTrabalho; OrdemProducao ainda não implementa explícita — delega ao repositório).
- **`UnidadeCiclos` obrigatório** (ciclo produtivo).
- Consistência: `GrupoMaquina` do CT == `GrupoMaquina` da ordem.
- Se CT definido → `DtDistribuida=agora`.
- Pelo menos **uma** das quantidades (`QtdUnidade`/`Metragem`/`Peso`/`Area`/`Volume`/`Especifica`) > 0 — operis usa `quantidadePlanejada` única (simplificação); ver se precisa desmembrar.
- `DtEncerraOrdem >= DtCriada`.
- **Anti-auto-referência pai/filho**: `OperacaoPai` != mesma ordem+identificador.
- `OperacaoPai`/`OperacaoSequencia` devem existir e ser do mesmo estabelecimento.
- **`CentroTrabalhoValido`** (string `;`) — cada item deve existir cadastrado.
- `OrigemOrdem` fora de 0–2 → default `1` (Octopus).

**❌ Faltantes (ciclo de vida — `OrdemProducaoRN.cs`, 2134 linhas):**
- **`LiberarOrdensProducao`** (status `NaoLiberada`→`Liberada` em cascata pai/filha/irmã) — hoje há só o default no create; rota de liberação não existe.
- **`CancelarOrdensProducao`** — bloqueio se status `Baixada/Iniciada/Concluida/Cancelada`; bloqueio se `Baixada` exige devolução; cascata pai/filha recursiva (`AgruparOrdensPaiFilha`); cancela movimentos + reservas + finaliza erros; transação dual (Principal+Manufatura).
- **`ReexecutarOrdensProducao`** — move `Concluida/Recusada/Cancelada` → `Liberada`; bloqueia filha "baixada no CT" não concluída/recusada; limpa `DtBaixada`/`DtInicioExecucao`/`DtFimExecucao`; zera `DtEncerraOrdem` se no passado.
- **`ReintegrarOrdensProducao`** — mesmos status → `Liberada`, reseta datas.
- **`DevolverOrdensProducao`** — só status `Baixada`.
- **`BaixarOrdensProduco(cdCT, qtdMax)`** (Empurrada) — baixa ordens liberadas para o CT até `qtdMax`, incluindo filhas não executadas.
- **`BuscarOrdemProducaoTerminal`** (Puxada) — bloqueia se `Modo=Empurrada`, status inválidos, valida vínculo CT↔Ordem (GrupoMaquina/CentroTrabalhoValido/CT explícito), inclui filhas não executadas.
- **`SincronizarOrdemProducao`** — sincroniza campos reportados do terminal (apontamentos/status/datas).
- **`EditarOrdemProducao`** — bloqueia se `Concluida`; se edição do site, bloqueia `Baixada/Recusada/Iniciada/Concluida/Cancelada`; preserva `DtCriada`; sincroniza ferramentas (remove desvínculadas, adiciona novas).
- **`AdicionarOrdemIntegracao`** (ERP) — sleep 100ms, loga no ERP, validação de integração + duplicidade, transação única com **vinculação de ferramentas** se `TipoControle=Operacao`, adiciona reservas, status inicial conforme `DtLiberacao`.
- **`PassarOrdensProducaoParaHistorico(diasHistorico)`** — move movimentos para histórico (soma tempos/quantidades), `EncerrarOrdensProgramadas` (vencimento de `DtEncerraOrdem`), move ordens com `dtFimExecucao < agora-dias` para `OrdemProducaoHistorico`, move etiquetas/rastreabilidades/reservas, sleep 5s entre lotes.

### 4.2 Regras de Despacho (`CentroTrabalhoRN.cs`) ❌
- `ListarCentrosTrabalhoDistribuirOrdemProducao`: só ordens `Empurrada`; resolução de CTs válidos por `CentroTrabalhoValido` (split `;`), `GrupoMaquina`, fallback para o grupo da ordem; escolha do melhor CT via `MenorTempoOrdensProducaoPendente`.
- `OrdenarOrdensProducaoRegraDespacho` (Factory): `MENOR_OPERACAO`/`DATA_ENTREGA`/`PRIORIDADE`/`CODIGO_REDUTOR` — cada um ordena por campo distinto.
- O enum `RegraDespacho` já existe no schema e no `GrupoMaquina`, **mas nenhuma lógica o consome ainda**.

### 4.3 Turno / Calendário (paridade parcial) 🟡
Calendário CRUD migrado; **Turno não migrado como agregado próprio** (existe como metadados no Calendario? Confirmar).

**❌ Faltantes:**
- **Turno que cruza meia-noite**: se `DtHrInicioTurno >= DtHrFimTurno`, adiciona 1 dia ao fim — regra em `TurnoRN` e em `CalculoIndicadoresRN`.
- `TempoDisponivel <= TempoTotal`, ambos não-zero.
- Lista de `DiaDaSemana` não-vazia.
- Associação Turno↔Calendário.

### 4.4 Movimentos ❌ (TODO crítico)
Nada migrado. Regras principais do `MovimentosRN.cs`:
- **`EnumTipoMovimento`**: `Reporte`/`Preparacao`/`Parada`/`Refugo`/`Recusa`/`Estorno`/`Alerta`/`Requisicao`/`Devolucao`/`TrocaFerramental`/`TrocaTurno`/`Historico`.
- Tipos que exigem `OrdemProducao`: `Reporte`/`Refugo`/`Recusa`/`Requisicao`/`Devolucao`.
- `Requisicao`/`Devolucao` exigem `Reserva` (CdItem+SequenciaReserva>0).
- `CentroTrabalho` obrigatório; edição do site exige ativo.
- `Usuario` e `CdOperador` cadastrados (operador não vazio).
- `Parada` exige `TipoParada`; `Refugo` exige `TipoRefugo`; `Recusa` exige `TipoRecusa`; `TrocaFerramental` exige `Ferramenta`.
- **Autocadastro do terminal**: se `TipoParada/Refugo/Causa/Recusa` não existem no DB, **adiciona automaticamente** (parada com `Criticidade=Normal`). Só terminal — não site.
- `Turno` obrigatório; `DtTurno` default `DtHrInicioTurno`.
- `DtInicioMovimento` default `agora`.
- Movimento em aberto **sem `ReportaERP`** → `DtIntegracao=agora` (finalizado offline).
- **Estorno automático**: `qtdMovimento < 0` em `Reporte` → inverte quantidade e **converte tipo para `Estorno`**.
- Cálculo de `TempoMovimento`/`TempoSolicitacao`/`TempoManutencao` por diferença de datas.
- **`CancelarMovimento`**: bloqueia se já cancelado; **NÃO CANCELA se `DtIntegracao != null` (já integrado)**; concatena observação com timestamp; registra `CdUsuarioCancelamento`; finaliza erros do movimento.
- **`ReintegrarMovimento`**: só `ReportaERP=true`; limpa `DtIntegracao`, `Cancelado=false`, marca recalculo de indicadores.
- **`AtualizarMovimento`** (terminal): se existir e cancelado do site→erro; do terminal→sucesso sem alterar; se integrado→site:erro/terminal:ignora; só atualiza se em aberto.
- **Regra de não-paralelismo** (no `CentroTrabalhoOnline`): não pode haver `Reporte`+`Preparacao`+`Parada` abertos ao mesmo tempo (pega último por `DtInicio`).

### 4.5 Reservas ❌
`EnumStatusReserva { NAO_REQUISITADA, REQUISITADA, CANCELADA }`. Regras:
- Adicionar exige `OrdemProducao` + `CdItem` + `DsItem` + `SequenciaReserva >= 1` + `QtdReserva/Requisitada/Devolvida >= 0`.
- **Status automático**: `QtdRequisitada=0` → `NAO_REQUISITADA`; `>0` → `REQUISITADA`.
- `ValidarStatusOrdemReserva`: bloqueia manipular reserva de ordem `Baixada/Cancelada/Concluida/Recusada/Iniciada` (no site); terminal aceita qualquer.
- `CancelarReserva` cancela movimentos vinculados (`CancelarMovimentosReserva`); idempotente.

### 4.6 Plano Produção (executivo) 🟡
Agregado cadastrável existe; regras de **validação + conflito** faltantes:
- Exige `CentroTrabalhoItem` existente (artigo↔CT) — operis usa `ArtigoCentroTrabalho`.
- `Quantidade > 0`, `DtFimProducao >= DtInicioProducao`.
- **Bloqueio de conflito de data** (intervalo sobreposto para o mesmo CT) — `BuscarIdPlanoPorCTeDatas`.
- **Unicidade CT-Item** — cada relação CT-Item só um plano.
- **`CriarOrdemPlanosProducao`**: gera `OrdemProducao` a partir do plano copiando Item/GrupoMaquina/CT/tempos; define `ModoDistribuicao=Puxada`, `TipoReporte=Movimento`, `DtEncerraOrdem=agora+30d`, `VariacaoReporte=999`.

### 4.7 Ferramentas + Consumo ❌
`FerramentaRN.cs`:
- `CdFerramenta`/`DsFerramenta` obrigatórios.
- **`NivelAlerta` e `NivelCritico` entre 0 e 100** (percentual).
- Editar: se `TipoControle` mudou `CentroTrabalho`→outro e há vínculos CT↔Ferramenta, bloqueia.
- `ConsumoFerramentaRN`:
  - **Modo Operação** (`TipoControle=Operacao`): lista movimentos das ordens vinculadas à ferramenta.
  - **Modo CentroTrabalho**: lista trocas do CT; entre cada troca recorta os movimentos (início=troca anterior, fim=troca atual); acumula repetidos em uma linha.
  - Por movimento: tempo realizado (exceto Refugo), quantidades (Unidade/Metragem/Peso/Area/Volume/Especifica).
  - **Flag `ConsideraConsumoPreparacao`**: se true, soma também movimentos de Preparação.
  - Persiste `ConsumoFerramenta` (soma acumulada) + `MovimentosFerramenta` (detalhe); se já existe, subtrai antigo + soma novo.

### 4.8 Equipamentos / Terminais ❌ (12 botões, trocas automáticas)
`EquipamentoManufaturaRN.cs` — inteiro ausente:
- **12 botões de Centro de Trabalho** (`CentroTrabalhoBotao1..12`).
- **`ValidaUnicidadeCentroTrabalho`**: mesmo CT não pode estar em mais de um botão do mesmo equipamento.
- **Exclusividade global**: CT não pode vincular-se a mais de um Equipamento/Terminal.
- **Trocas automáticas**: `TrocaTurnoAutomatico=false` força `TrocaOperadorAutomatico=false`; `TrocaOperadorAutomatico=true` força `ValidaOperador=false`.
- **`SenhaBancoIntegracao` sempre cifrada** (`Constants.CRYPT_KEY`) ao salvar se diferente da cadastrada.
- `TestarConexaoTerminal` → `AtivoEm=agora`, `Online=true`.
- `FecharConexaoTerminal` → `AtivoEm=null`, `Online=false`, `CdUsuarioConectado=null`.
- **`MatarConexoesAplicativoTerminal`**: timeout `onlineTimeOut` (marca `Online=false`, sessão `SMART_CONNECT`) e `offlineTimeOut` (remove sessão e desvincula).
- **`AtualizarRelacionamentoEquipamentoCT`**: ao salvar equipamento, propaga `IdEquipamento` nos CTs dos 12 botões (e remove dos que saíram).

### 4.9 Centro Trabalho Online ❌ (monitor de chão de fábrica — crítico)
`CentroTrabalhoOnlineRN.MontarCentroTrabalhoOnline` — regras críticas:
- CT existe + ativo + **tem equipamento vinculado** (sem equipamento não há online).
- Captura `movimentosAlertaEmAberto` do CT; se houver, seta `UsuarioConectado`, `idTurno`, `diaTurno`, `MensagemAlerta` (descrição do `TipoParada`).
- **Carga Pendente Teórica**: lista ordens em aberto, calcula `qtdRestante = QtdProduzir - QtdProduzida`; **converte ciclo padrão peças/h → peças/seg** via `3600/UnidadeCiclos`; acumula `cargaPendenteTeorica = qtdCicloPadraoSegundos * qtdRestante`.
- **Última parada encerrada** (tipo, datas início/fim, tempo, tipo causa, técnico manutenção).
- Movimentos em aberto (`Reporte`/`Preparacao`/`Parada`) — valida não-paralelismo (último por `DtInicioMovimento`).
- **Cálculo % Padrão/Apontado**:
  - `TempoMaquinaPadraoPorApontado = TempoMaquinaApontado / TempoMaquina * 100` (e análogos).
  - `UnidadeCiclosExecutada = QtdProduzida / TempoMaquinaApontado.TotalSeconds`.
  - `UnidadeCiclosPadraoPorExecutada = (UnidadeCiclosExecutada / UnidadesCicloPadraoOrdemProducao) * 100`.
- **Status (8)**:
  - `Preparacao` → `EM_SETUP` (+ `OperadorPreparacao`).
  - `Parada` → `PARADA` (calcula `TempoParada`); se `TipoParada.ControlaManutencao` e há `DtFimSolicitacao` → `MANUTENCAO_EM_EXECUCAO` (calcula `TempoSolicitacao`/`TempoManutencao`); sem `DtFimSolicitacao` → `MANUTENCAO_SOLICITADA`.
  - `Reporte` → `PRODUZINDO`; calcula `AuxTempoHomem` × `NumeroHomem` da ordem; **se `UnidadeCiclosExecutada < UnidadesCiclosPadraoOrdemProducao` → `BAIXO_DESEMPENHO`**.
  - Sem movimento aberto → `OCIOSA`.
- **Truncagem overflow** `valorMax=99999999` (tempos, %, quantidade, temperatura, velocidade, pressão).
- Exibição: multiplicar `UnidadeCiclosExecutada * 3600` para "peças/hora".
- `BuscarCentroTrabalhoOnlineResumidoPorStatus` — 8 DTOs distintos por status (Desconectado / BaixoDesempenho / EmSetup / ManutencaoExecutando / ManutencaoSolicitada / Ocioso / Parado / Produzindo).
- `LimparMensagemAlertaCentroTrabalhoOnline`: finaliza o movimento de alerta, remove mensagem, zera `DtIntegracao` se não reporta ERP, `DtFimMovimento=agora`.
- `DesconectarUsuario`: remove sessão do usuário conectado ao CT online.

### 4.10 Cálculo de Indicadores (OEE/TEEP) ❌ (crítico)
`CalculoIndicadoresRN.MontarOEE` — fórmulas críticas:
- `MontarPreCalculosOEE`: gera `MovimentosCalculoIndicadores` por movimento (em aberto → `DtFimMovimento=agora`, `Recalcular=true`); `TempoMovimento = DtFim - DtInicio`.
- Se `movimento.Cancelado` → zera quantidades/tempos.
- **Switch por tipo + flag `ConsideraOEE`**:
  - `Reporte` → `QtdProduzida = quantidade`.
  - `Estorno` → `QtdProduzida = quantidade * -1` (reverte OEE).
  - `Refugo`/`Parada`/`Preparacao`:
    - considera OEE: `QtdRefugoOEE`/`TempoParadaOEE`/`QtdPerdaOEE + TempoPreparacaoOEE`.
    - não considera: variantes sem OEE (só registradas).
- **Ciclo padrão da ordem**: agrupa por `IdOrdemProducao`; `auxUnidadesCicloPadraoOrdemProducao = UnidadeCiclos/3600` (peças/h → peças/seg); se `UnidadeCiclos` indefinido, deriva `QtdProduzir/TempoMaquina`.
- **`tempoDisponivelTurno`**:
  - início do turno no futuro → `TimeSpan.Zero`.
  - fim do turno no futuro → `dtInicioTurno → agora`.
  - limitado ao `TempoDisponivel` cadastrado.
- **Qualidade** = `QtdProduzida / (QtdProduzida + QtdRefugoOEE + QtdPerdaOEE)` (0 se só refugo; 1 se tudo zero).
- `TempoNaoOEE = TempoParada + TempoPreparacao` (não considerados no OEE).
- `TempoDisponivelOEE = TempoDisponivelTotal - TempoNaoOEE`.
- `TempoProducaoTotal = TempoProducao + TempoPreparacaoOEE`.
- Se `TempoDisponivelOEE < TempoProducaoTotal` → ajusta `TempoDisponivelOEE=TempoProducaoTotal`, zera perdas/ociosidade.
- Senão: `PerdaTempoDisponibilidade = min(TempoParadaOEE, restante)`; `TempoOciosidade = TempoDisponivelOEE - TempoProducaoTotal - PerdaTempoDisponibilidade`.
- **Disponibilidade** = `TempoProducaoTotal / TempoDisponivelOEE` (default 1 se zero).
- Agrupamento por `CicloPadraoOrdem` (round 8 casas):
  - `PerdaTempoQualidade = (QtdRefugada + QtdPerda) / cicloPadrao` (segundos).
  - `TempoTeoricoProducao = QtdProduzida / cicloPadrao` (segundos).
- **Eficiência (Performance)** = `TempoTeoricoProducao / tempoProducaoCiclo` (default 1 se zero).
- `PerdaTempoPerformance = max(tempoProducao - TempoTeoricoProducao, 0)`.
- **`OEE = Qualidade * Disponibilidade * Eficiencia`** (cada cap em 1).
- **`TEEP = OEE * (TempoDisponivelOEE / TempoDisponivelTotal)`** (default 1 se total=0).
- **Perdas Financeiras**: se `custoMaquinaHora > 0` → `PerdaFinanceiraX = PerdaTempoX.segundos * custoMaquinaHora / 3600`.
- `PerdaTotal` = soma das paradas (disponibilidade + performance + qualidade).
- Exibição em % (× 100).
- **`AtualizarCalculoIndicadoresDia`** agrega todos os turnos do dia (mesmas fórmulas, TEEP proporcional).
- `AjustarCamposMax`: trunca tudo acima de `99999999` (mitigação overflow).

### 4.11 Etiquetas Manufatura ❌ (impressão Zebra)
`EtiquetaManufaturaRN.cs`:
- `ImprimirEtiqueta`: valida impressora; em transação Manufatura, se não-teste persiste etiqueta com `DtUltimaImpressao=agora`, `QtdImpressao=1`; busca layout ZPL por `CdLayoutEtiqueta`; **substitui variáveis via `EtiquetaManufaturaFactory.GerarEtiqueta`**; `EnviarArquivoImpressao` escreve `.prn` em `%TEMP%\Octopus_Man\`, copia para caminho UNC da impressora Zebra compartilhada, apaga temporário.
- `ImprimirEtiquetas(ids[], cdImpressora, justificativa)`: lote; incrementa `QtdImpressao`; concatena justificativa com `;`; se status `PENDENTE` → `DISPONIVEL`; se `OrdemProducao=null` recupera de `OrdemProducaoHistorico`.
- `CancelarEtiquetas`: status `CANCELADA`; concatena "Cancelado por {usuario} - {observacao}".
- `AdicionarEtiquetaIntegracao` (ERP): se `IdEtiqueta>0` edita campos via reflection (`camposEditar`); mapeia nomes amigáveis (`cdetiquetapai` → `EtiquetaPai`, `cdordemproducao`/`cdidentificadorordemproducao` → `OrdemProducao`); se `IdEtiqueta=0` adiciona, seta `OrigemEtiqueta=ERP`, `DtCriacao=agora`; seta `DtIntegracao=agora`.
- Status: `PENDENTE`, `DISPONIVEL`, `CANCELADA`.
- Origem: `ERP` vs outro.

### 4.12 Históricos ❌
`OrdemProducaoHistoricoRN`/`MovimentosHistoricoRN`/`ReservaHistoricoRN` — persistência de snapshots (chamada no `PassarOrdensProducaoParaHistorico`). Conversão manual do modelo vivo para o modelo histórico. Nada migrado.

### 4.13 Tipos (Parada/Refugo/Recusa/Causa + Áreas) 🟡
Cadastros base existem no Prisma com `criticidade`/`classificação`; vínculos com CT e regras faltantes.

**❌ Faltantes:**
- **Autocadastro vindo do terminal** (parada com `Criticidade=Normal`) — sem implementação.
- Vınculos CT↔Tipo (`CentroTrabalhoArea`, `CentroTrabalhoFerramenta`, etc.).
- `TipoParadaClassificacao` (`ControlaManutencao`/`InformaCausa`) e `TipoCausaClassificacao` (`Manutencao`/`Parada`) — enums existem, sem lógica que os consuma (ex.: `ControlaManutencao` → dispara fluxo de manutenção no `CentroTrabalhoOnline`).

---

## 5. Integrações externas — todas ❌

| Integração | Legado | Situação no operis |
|---|---|---|
| **ERP SOAP** (`WsIntegracao`) | `TestarWebService`, `TestarConexaoCliente_Man`, `BaixarOrdensProducao`, `ConfirmarOrdensProducaoBaixadas`, `IntegrarOrdensProducao`, `BaixarEtiquetasManufatura`, `ConfirmarEtiquetasManufaturaBaixadas`, `Especifico(xml)` com `AuthHeader`. | ❌ Adapter SOAP (`strong-soap`) planejado. |
| **Terminais SOAP** (`WsTerminais`) | `testarWebService`. | ❌ Planejado. |
| **SMTP** (MailKit) | Envio com TLS + auth. | ✅ Config cifrada no tenant; ❌ use-case de envio. |
| **Active Directory** (LDAP) | `validouAD=true` bypassa senha. | ❌ JWT-only. |
| **Impressoras Zebra** (UNC) | Cópia de `.prn` para `\\impressora\share`. | ❌ Pendente junto de etiquetas. |
| **SignalR** | Push para clients, chat, grupos, confirmação. | ❌ `operis-realtime` planejado. |
| **Servico Notificação HTTP** | `NotificationController.GetLink` expõe URL SignalR; `GetToken` hardcoded `usr_super:admin` base64. | ❌ Substituir por JWT-only no link. |

**Servicos Windows legados → workers Node (planejado) ❌:**
- `octopus.man.service_integracao`:
  - `DistribuirOrdensProducao` (loop 10s liberando ordens).
  - `MoverOrdensParaHistorico(diasHistorico)`.
  - `DeletarErrosManufatura(corte)`.
  - `MatarConexoesAplicativoTerminal`/`LimparSessaoUsuariosTerminais`.
  - `TestarWebServiceIntegracao` (ERP) + `TestarWebServiceTerminais`.
  - `GerenciarConcluirOrdens` — envio de movimentos ao ERP: padrão `PREFERENCIAL` (1 thread c/ erro + 1 s/ erro) ou `BALANCEADO` (divide em `_quantidadeThreadsIntegracao`), lotes de `_quantidadeMaximaMovimentosPacoteIntegracao`; em caso de falha registra erro `EnumTipoErro.ERP`; sucesso marca `DtIntegracao=agora`.
  - Configs: `_onlineTimeOut`/`_offlineTimeOut`/`_diasCorteIntegracaoERP`/`_quantidadeThreadsIntegracao`/`_quantidadeMaximaMovimentosPacoteIntegracao`/`_diasHistorico`/`_intervaloLiberacaoOrdens`/`_urlWebServiceTerminais`/`_modoEnvioIntegracao`.
- `Octopus.Sha.Servico`: threads `CriaNotificacao` (avaliação periódica) e `EnvioEmails` (fila).
- `octopus.man.service_calc`: serviço de cálculo (SPs de indicadores).

---

## 6. Priorização sugerida (top gaps por impacto de negócio)

| Prioridade | Lacuna | Impacto |
|---|---|---|
| 🔴 P0 | Movimentos + Reservas | Núcleo do apontamento de chão de fábrica; sem isso manufatura é só cadastro. |
| 🔴 P0 | CentroTrabalhoOnline (monitor realtime) | Visibilidade operacional; clientes dependem. |
| 🔴 P0 | Cálculo de Indicadores (OEE/TEEP) | Principal valor de negócio do produto manufatura. |
| 🟠 P1 | Ciclo de vida da OrdemProducao (liberar/cancelar/devolver/baixar/reexecutar) + pai/filha | Ordem fica inerte sem o ciclo. |
| 🟠 P1 | Regras de Despacho (`RegraDespacho`) consumer a ordem na fila | Decisão de qual CT pega qual ordem. |
| 🟠 P1 | Turno que cruza meia-noite + cálculo de `TempoDisponivel` proporcional ao agora | Pré-requisito para indicadores. |
| 🟠 P1 | Equipamentos/Terminais (12 botões, trocas automáticas, timeouts) | Pré-requisito para CentroTrabalhoOnline. |
| 🟡 P2 | Etiquetas Zebra + `EtiquetaManufaturaFactory` (substituição de coringas) | Operação de chão de fábrica. |
| 🟡 P2 | Ferramentas + Consumo | Cálculo de perdas e manutenção. |
| 🟡 P2 | Motor de notificações (disparo + fila e-mail + realtime + alerta de queda) | Adesão a alertas operacionais. |
| 🟡 P2 | Erros RN (`ErroRN`) + integração ERP SOAP | Observabilidade + ERP loop fechado. |
| 🟢 P3 | Históricos (mover para histórico por idade) | Higiene de dados, performance. |
| 🟢 P3 | Recuperação de senha por e-mail + Política de expiração/tentativas | Experiência admin/sec. |
| 🟢 P3 | Biometria funcional (cifragem + gateway) | LGPD; depende de hardware/SDK. |

---

## 7. Decisões divergentes intencionais (NÃO são faltantes)

| Regra | Legado | Operis | Justificativa |
|---|---|---|---|
| Status code HTTP | `200 { Ok:false }` | 4xx/5xx semântico | Padrão REST moderno. |
| Exclusão de estabelecimento | Física c/ bloqueio dual-banco | Soft-delete (`status=INATIVO`) | Cascade apagaria tudo; reversível. |
| Exclusão de crachá | Sem validar existência | 404 explícito se ausente | Diagnóstico amigável. |
| Senha | MD5 sem salt | scrypt +Salt | Securança; usuários redefinam senha na migração |
| Cascades | Scripts SQL | `onDelete: Cascade` no schema | Consistência referencial declarativa. |
| Colunas Auxiliares (50 coringas) | Presentes | Descartadas | Sem uso vivo identificado. |
| 10 colunas de digital | Fixas na tabela | Tabela filha 1:N | Modelagem correta. |
| `Fachada` God-class | Um arquivo 3934 linhas | Use-cases isolados injetando Port | DDD. |
| Estab→CT | Indireto via Calendario | FK direta `estabelecimentoId` | Simplificação. |
| Vínculos N:N | Surrogate PK | PK composta | Sem surrogate inútil. |
| Online de IoT | Persistido | Derivado broker em tempo real | Estado persistido fica obsoleto. |
| Ingestão IoT descartável | Cai o lote inteiro | Descarte com motivo, não derruba lote | Um coletor mal configurado não trava os demais. |

---

## 8. Próximos passos sugeridos

1. **Confirmar com o negócio** as regras críticas que serão efetivamente usadas (ex.: `CentroTrabalhoValido` em string `;` ou modelagem diferente).
2. **Desmembrar os P0** em épicos: `Movimentos`, `CentroTrabalhoOnline`, `Indicadores`.
3. **Mapear SPs de cálculo legadas** — se houver lógica em stored procedures (suspeita em `CalculoIndicadores`), decidir entre portar para TS puro ou `Prisma.$queryRaw` em function PG.
4. **Compatibilidade de paridade** — para cada RN migrada, gerar teste de snapshot input/output tirado do legado (mesma entrada, mesma saída).
5. Atualizar este documento a cada módulo migrado, mudando os ❌ → 🟡 → ✅ no placar da §2.