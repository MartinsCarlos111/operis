# Checklist de Lacunas — Octopus → Operis

> Companion de `comparativo-regras-negocio.md`. Use como TODO de migração.
> Marque `[x]` ao concluir e atualize o placar ao final.

Legenda: P0 crítico · P1 alto · P2 médio · P3 baixo

---

## P0 — Crítico (bloqueia manufatura real)

- [x] **Movimentos** (`MovimentosRN.cs`) — agregado `Movimento` criado (módulo `manufatura`)
  - [x] Enum `TipoMovimento` (13 valores — o legado tinha 13 + o sentinela `UNKNOWN=0`, descartado)
  - [x] Validações por tipo (Reporte/Refugo/Requisicao/Devolucao exigem ordem; Requisicao/Devolucao exigem reserva; Parada exige TipoParada; Refugo→TipoRefugo; Recusa→TipoRecusa)
  - [x] Operador não vazio
  - [x] Autocadastro de TipoParada/Refugo/Causa/Recusa vindo do terminal (só terminal; Parada→Criticidade=Normal)
  - [x] Turno obrigatório + `DtTurno` default no início do turno (via `Turno.resolverJanela`)
  - [x] `DtInicioMovimento` default agora
  - [x] Estorno automático: `qtd < 0` em Reporte → inverte qtd e converte para `Estorno`
        (só na unidade que o Centro de Trabalho reporta)
  - [x] Não-paralelismo (Reporte/Preparacao/Parada abertos — último por DtInicio)
  - [x] `CancelarMovimento`: bloqueia se `Cancelado` ou `DtIntegracao != null`; concatena observação com timestamp; registra usuário de cancelamento
  - [ ] ...e "finaliza erros" (`FinalizarErrosMovimento`) — **pendente**, o módulo `ErroRN` não existe (ver P2)
  - [x] `ReintegrarMovimento`: só `ReportaERP=true`; limpa `DtIntegracao`
  - [ ] ...e marca recálculo de indicadores — **pendente**, depende de `MovimentosCalculoIndicadores` (P0 "Cálculo de Indicadores")
  - [ ] `AtualizarMovimento` (terminal vs site — regras distintas para cancelado/integrado) — **pendente**
  - [x] CRUD + rotas `/manufatura/movimentos` (+ `/terminal`, `/:id/cancelar`, `/:id/reintegrar`) + 32 testes
  - > **Pendências por dependência inexistente:** o tipo `TROCA_FERRAMENTAL` não valida
  > a `Ferramenta` associada (agregado não migrado, ver P2), e `QualidadeItem` ficou
  > fora do modelo pelo mesmo motivo.

- [x] **Reservas** (`ReservaRN.cs`) — agregado `Reserva` criado (módulo `manufatura`)
  - [x] Enum `StatusReserva { NAO_REQUISITADA, REQUISITADA, CANCELADA }`
  - [x] Adicionar exige `OrdemProducao` + `CdItem` + `DsItem` + `SequenciaReserva>=1` + `Qtd>=0`
  - [x] Status automático por `QtdRequisitada` (0→NAO_REQUISITADA; >0→REQUISITADA), e
        CANCELADA é terminal — não volta por mudança de quantidade
  - [x] `ValidarStatusOrdemReserva`: bloqueia se ordem Baixada/Cancelada/Concluida/Recusada/Iniciada (site; terminal aceita)
  - [x] `CancelarReserva` idempotente (não exclui: vira status CANCELADA)
  - [ ] ...e cancela os movimentos vinculados — **pendente**. O agregado Movimento já
        existe; falta injetar o cancelamento em cascata no `CancelarReservaUseCase` e
        envolver as duas escritas numa transação (como o `BeginTransactionManufatura`
        do legado). É o próximo passo natural.
  - [x] CRUD + rotas `/manufatura/reservas` (+ `/terminal`) + 25 testes
  - > **Nota de segurança:** a origem terminal é o PATH da rota, não um campo do
  > body — assim não é possível burlar o `ValidarStatusOrdemReserva` mandando uma
  > flag. `status` também não entra pelo body: é sempre derivado.

- [ ] **CentroTrabalhoOnline** (`CentroTrabalhoOnlineRN.cs`) — monitor realtime
  - [ ] CT existe + ativo + tem equipamento vinculado
  - [ ] Captura `movimentosAlertaEmAberto` (UsuarioConectado/turno/MensagemAlerta)
  - [ ] Carga Pendente Teórica: `qtdRestante = QtdProduzir - QtdProduzida`; ciclo `3600/UnidadeCiclos` → peças/seg; acumula
  - [ ] Última parada encerrada (tipo/datas/tempo/causa/técnico)
  - [ ] % Padrão/Apontado (TempoMaquina/Preparacao/Homem + UnidadeCiclos executada vs padrão)
  - [ ] 8 status: EM_SETUP / PARADA / MANUTENCAO_EM_EXECUCAO / MANUTENCAO_SOLICITADA / PRODUZINDO / BAIXO_DESEMPENHO / OCIOSA / Desconectado
  - [ ] BAIXO_DESEMPENHO quando `UnidadeCiclosExecutada < UnidadesCicloPadraoOrdemProducao`
  - [ ] Truncagem overflow `99999999`
  - [ ] Exibição `UnidadeCiclosExecutada * 3600` (peças/hora)
  - [ ] `BuscarCentroTrabalhoOnlineResumidoPorStatus` (8 DTOs distintos)
  - [ ] `LimparMensagemAlertaCentroTrabalhoOnline`
  - [ ] `DesconectarUsuario`

- [ ] **Cálculo de Indicadores (OEE/TEEP)** (`CalculoIndicadoresRN.cs`)
  - [ ] `MontarPreCalculosOEE` (MovimentosCalculoIndicadores por movimento; aberto→DtFim=agora,Recalcular=true)
  - [ ] Cancelado zera qtd/tempos
  - [ ] Switch por tipo + flag `ConsideraOEE` (Reporte→QtdProduzida; Estorno→QtdProduzida*−1; Refugo/Parada/Preparacao→ variantes OEE/não-OEE)
  - [ ] Ciclo padrão por ordem: `UnidadeCiclos/3600` ou derivar `QtdProduzir/TempoMaquina`
  - [ ] `tempoDisponivelTurno`: futuro→Zero; fim futuro→`inicioTurno→agora`; limitado ao cadastrado
  - [ ] **Qualidade** = `QtdProduzida / (QtdProduzida + QtdRefugoOEE + QtdPerdaOEE)` (0 só refugo, 1 tudo zero)
  - [ ] `TempoDisponivelOEE = TempoDisponivelTotal - TempoNaoOEE`
  - [ ] `TempoProducaoTotal = TempoProducao + TempoPreparacaoOEE`
  - [ ] Ajuste se `TempoDisponivelOEE < TempoProducaoTotal`
  - [ ] `PerdaTempoDisponibilidade = min(TempoParadaOEE, restante)`
  - [ ] `TempoOciosidade = TempoDisponivelOEE - TempoProducaoTotal - PerdaTempoDisponibilidade`
  - [ ] **Disponibilidade** = `TempoProducaoTotal / TempoDisponivelOEE` (default 1 se 0)
  - [ ] Agrupamento por CicloPadraoOrdem (round 8): `PerdaTempoQualidade` + `TempoTeoricoProducao`
  - [ ] **Eficiência (Performance)** = `TempoTeoricoProducao / tempoProducaoCiclo` (default 1 se 0)
  - [ ] `PerdaTempoPerformance = max(tempoProducao - TempoTeoricoProducao, 0)`
  - [ ] **OEE** = `Qualidade * Disponibilidade * Eficiencia` (cap 1 em cada)
  - [ ] **TEEP** = `OEE * (TempoDisponivelOEE / TempoDisponivelTotal)` (default 1 se total 0)
  - [ ] Perdas Financeiras: `PerdaFinanceiraX = PerdaTempoX.seg * custoMaquinaHora / 3600` (se custo>0)
  - [ ] `PerdaTotal` = soma das paradas
  - [ ] `AtualizarCalculoIndicadoresDia` (agrega turnos; TEEP proporcional)
  - [ ] `AjustarCamposMax` (trunca > 99999999)

---

## P1 — Alto (ciclo de vida da ordem + suporte ao monitor)

- [ ] **Ciclo de vida da OrdemProducao** (`OrdemProducaoRN.cs`)
  - [ ] Validações restantes do `ValidarOrdemProducao`: UnidadeCiclos obrigatório; GrupoMaquina do CT==GrupoMaquina ordem; Ct definido→DtDistribuida=agora; DtEncerraOrdem>=DtCriada; anti-auto-ref pai/filho; OperacaoPai/Sequencia existem e mesmo estab; CentroTrabalhoValido split `;` cada um cadastrado; pelo menos uma qtd>0 (unidade/metragem/peso/area/volume/especifica)
  - [ ] `LiberarOrdensProducao` (NaoLiberada→Liberada em cascata pai/filha/irmã)
  - [ ] `CancelarOrdensProducao` (bloqueios + cascata pai/filha recursiva + transação dual)
  - [ ] `ReexecutarOrdensProducao` (Concluida/Recusada/Cancelada→Liberada; bloqueia filha baixada não concluída)
  - [ ] `ReintegrarOrdensProducao`
  - [ ] `DevolverOrdensProducao` (só Baixada)
  - [ ] `BaixarOrdensProduco(cdCT, qtdMax)` (Empurrada; filhas não executadas)
  - [ ] `BuscarOrdemProducaoTerminal` (Puxada; bloqueia Empurrada; valida vínculo CT↔Ordem)
  - [ ] `SincronizarOrdemProducao` (terminal)
  - [ ] `EditarOrdemProducao` (bloqueios por status; preserva DtCriada; sync ferramentas)
  - [ ] `AdicionarOrdemIntegracao` (ERP: sleep 100ms + log + validação dupla + transação única com ferramentas/reservas)
  - [ ] `PassarOrdensProducaoParaHistorico(dias)` (move movimentos, encerra ordens programadas, move etiquetas/rastreabilidades/reservas; sleep 5s entre lotes)

- [ ] **Regras de Despacho** (consumer da `RegraDespacho` do `GrupoMaquina`)
  - [ ] `ListarCentrosTrabalhoDistribuirOrdemProducao`: só Empurrada; resolve CTs válidos; escolhe melhor CT via `MenorTempoOrdensProducaoPendente`
  - [ ] `OrdenarOrdensProducaoRegraDespacho`: MENOR_OPERACAO/DATA_ENTREGA/PRIORIDADE/CODIGO_REDUTOR

- [x] **Turno que cruza meia-noite** — agregado `Turno` criado (módulo `manufatura`)
  - [x] Se início `>=` fim → adiciona 1 dia ao fim — `Turno.resolverJanela()`
  - [ ] ...o mesmo em `CalculoIndicadoresRN` (pendente: `indicadores` não existe; quando existir, deve **consumir** `resolverJanela` em vez de reimplementar)
  - [x] `TempoDisponivel <= TempoTotal`, ambos não-zero
  - [x] Lista `DiaDaSemana` não-vazia
  - [x] Associação Turno↔Calendario (FK obrigatória, código único por calendário)
  - [x] CRUD + rotas `/manufatura/turnos` + 18 testes
  - > **Divergência deliberada:** o legado guarda início/fim como `DateTime` cuja
  > parte de data é descartada, e `ValidarTurno` recusava início > fim enquanto o
  > runtime somava 1 dia ao fim para suportar exatamente esse caso. Modelamos
  > como minutos desde a meia-noite (0..1439) e mantivemos o comportamento do
  > **runtime**, que é o que a fábrica usa.

- [ ] **Equipamentos / Terminais** (`EquipamentoManufaturaRN.cs`)
  - [ ] 12 botões de Centro de Trabalho
  - [ ] `ValidaUnicidadeCentroTrabalho` (mesmo CT não em 2 botões do mesmo equipamento)
  - [ ] Exclusividade global (CT não em 2 equipamentos)
  - [ ] Trocas automáticas: `TrocaTurnoAutomatico=false`→`TrocaOperadorAutomatico=false`; `TrocaOperadorAutomatico=true`→`ValidaOperador=false`
  - [ ] `SenhaBancoIntegracao` sempre cifrada ao salvar
  - [ ] `TestarConexaoTerminal` / `FecharConexaoTerminal`
  - [ ] `MatarConexoesAplicativoTerminal` (onlineTimeOut/offlineTimeOut/SMART_CONNECT)
  - [ ] `AtualizarRelacionamentoEquipamentoCT` (propaga IdEquipamento nos 12 botões)

---

## P2 — Médio

- [ ] **Etiquetas Manufatura** (`EtiquetaManufaturaRN.cs`)
  - [ ] `ImprimirEtiqueta` (valida impressora; transação; DtUltimaImpressao=agora; QtdImpressao=1)
  - [ ] `EtiquetaManufaturaFactory.GerarEtiqueta` (substituição de coringas `@VARIAVEL` no ZPL)
  - [ ] `EnviarArquivoImpressao` (escreve `.prn` em TEMP, copia para UNC da Zebra, apaga temp)
  - [ ] `ImprimirEtiquetas(ids[], cdImpressora, justificativa)` (lote; ++QtdImpressao; concat justificativa `;`; PENDENTE→DISPONIVEL)
  - [ ] `CancelarEtiquetas` (status CANCELADA; concat "Cancelado por {user} - {obs}")
  - [ ] `AdicionarEtiquetaIntegracao` (ERP; reflection camposEditar; mapeia nomes amigáveis; OrigemEtiqueta=ERP; DtIntegracao=agora)

- [ ] **Ferramentas + Consumo** (`FerramentaRN.cs` + `ConsumoFerramentaRN.cs`)
  - [ ] `NivelAlerta`/`NivelCritico` 0..100
  - [ ] Editar bloqueia mudança de `TipoControle` se há vínculos CT↔Ferramenta
  - [ ] Consumo modo `Operacao` (movimentos das ordens vinculadas)
  - [ ] Consumo modo `CentroTrabalho` (recorte entre trocas; acumula repetidos)
  - [ ] Flag `ConsideraConsumoPreparacao` (soma Preparação)
  - [ ] Persistir `ConsumoFerramenta` + `MovimentosFerramenta` (subtrai antigo + soma novo)

- [ ] **Motor de Notificações** (cadastro já OK, falta o runtime)
  - [ ] `CriaNotificacao` thread periódica: monta SQL dinâmico das condições; tipos (enum/int/TimeSpan/bool com variantes S/N/1/0); token `regra_tabela_colunaId` anti-duplicidade; substitui `@coringas`
  - [ ] `EnvioEmails` thread: `DIAS_NOTIFICACAO` (cancela antigos); envia pendentes via SMTP
  - [ ] SMTP via `nodemailer` (config cifrada do tenant já existe)
  - [ ] Status `{ PENDENTE_ENVIO, ENVIADA, CANCELADA }`; `CancelarNotificacoes(dataLimite)`
  - [ ] Anexos (formato `caminho%idatividade`)
  - [ ] **Alerta de Queda de Integração ERP**: configs `NOTIFICAR_QUEDA_INTEGRACAO`/`EMAIL_*`/`TEMPO_*`; validação (nº `@` == nº emails); HTML com função/erro/stacktrace/data
  - [ ] Realtime (SignalR → `operis-realtime`): ShowClientsOnLine/UsersChatOnLine/SendMessageToClients/SendMessageToGroups/ReceiveMessageConfirm; lifecycle connect/disconnect; limpeza > 1 dia

- [ ] **Erros** (`ErroRN.cs`)
  - [ ] `GravarErroFuncao/Movimento/Ordem`
  - [ ] `FinalizarErros*` / `EncerrarErro`
  - [ ] `ExcluirErrosCorteHistorico`

- [ ] **Integração ERP SOAP** (`WsIntegracao`)
  - [ ] `TestarWebService`/`TestarConexaoCliente_Man`
  - [ ] `BaixarOrdensProducao`/`ConfirmarOrdensProducaoBaixadas`
  - [ ] `IntegrarOrdensProducao` (retorno de movimentos)
  - [ ] `BaixarEtiquetasManufatura`/`ConfirmarEtiquetasManufaturaBaixadas`
  - [ ] `Especifico(xml)` com `AuthHeader`

- [ ] **Workers** (substituir serviços Windows)
  - [ ] `DistribuirOrdensProducao` (loop 10s)
  - [ ] `MoverOrdensParaHistorico(dias)`
  - [ ] `DeletarErrosManufatura(corte)`
  - [ ] `MatarConexoesAplicativoTerminal`/`LimparSessaoUsuariosTerminais`
  - [ ] `TestarWebServiceIntegracao`/`TestarWebServiceTerminais`
  - [ ] `GerenciarConcluirOrdens` (modo PREFERENCIAL/BALANCEADO; lotes; erros ERP; DtIntegracao em sucesso)
  - [ ] Configs: `_onlineTimeOut`/`_offlineTimeOut`/`_diasCorteIntegracaoERP`/`_quantidadeThreadsIntegracao`/`_quantidadeMaximaMovimentosPacoteIntegracao`/`_diasHistorico`/`_intervaloLiberacaoOrdens`/`_urlWebServiceTerminais`/`_modoEnvioIntegracao`

---

## P3 — Baixo

- [ ] **Históricos** (OrdemProducao/Movimentos/Reserva)
  - [ ] Snapshot persistido após `PassarOrdensProducaoParaHistorico`
  - [ ] Conversão manual vivo→histórico

- [ ] **Tipos (Parada/Refugo/Recusa/Causa + Áreas) — lacunas**
  - [ ] Vínculos CT↔Tipo (`CentroTrabalhoArea`, `CentroTrabalhoFerramenta`)
  - [ ] Consumir `TipoParadaClassificacao` (ControlaManutencao/InformaCausa)
  - [ ] Consumir `TipoCausaClassificacao` (Manutencao/Parada)
  - [ ] Autocadastro do terminal (já citei em Movimentos — dedupe)

- [ ] **Recuperação de Senha** (`UsuarioRN.RecuperarSenha`)
  - [ ] Validar usuário+email (case-insensitive)
  - [ ] Ler configs SMTP do tenant (senha cifrada → decifra em memória)
  - [ ] Gerar senha aleatória 6 chars (A-Z0-9)
  - [ ] Hash scrypt + atualizar `UltimaAlteracaoSenha`
  - [ ] Enviar e-mail SMTP

- [ ] **Políticas de Login** (o VO `PoliticasLogin` existe, falta o executor)
  - [ ] `exigeMfa`
  - [ ] `expiracaoSenhaDias` (bloqueia expiração)
  - [ ] `maxTentativas` (conta tentativas; bloqueia após limite)

- [ ] **Sessão concorrente** (`SessaoRN.ChecarSessaoUsuario`)
  - [ ] APLICATIVO: múltiplas no mesmo `IdAplicacao`; bloqueia cross-app
  - [ ] PORTAL: bloqueia paralelo dentro de `PORTAL_SESSION_TIMEOUT`; retorna tempo restante
  - [ ] SMART_CONNECT (entre onlineTimeOut/offlineTimeOut)
  - [ ] Limpeza de terminais desconectados

- [ ] **Configurações transversais**
  - [ ] `BuscarCasasDecimais(cdEstab, produto)` com fallback global (default 2)
  - [ ] `BuscarConfiguracaoIntervaloMonitor` (default 10s; >= 5)
  - [ ] `ValidarConfiguracao` tipada (enum/int/TimeSpan/bool + UsoEstabelecimento + CampoSenha) para configs mutáveis por tela

- [ ] **Itens auxiliares**
  - [ ] `EstabelecimentoConsulta` (cadastro de consultas associadas)
  - [ ] `GetAreasRelacionadas`/`GetEnumAreas` (áreas)
  - [ ] `GetConfiguracaoCamposEtiquetaManufatura` (layouts)
  - [ ] Export/Import XLSX de áreas/impressoras/estabelecimentos/usuarios

- [ ] **Biometria funcional** (depende de hardware/SDK)
  - [ ] Entity/repo/use-cases de `CrachaBiometria` (enroll/listar/remover)
  - [ ] **Cifragem real AES-256-GCM** ao salvar (LGPD)
  - [ ] Port `GatewayBiometria` + serviço `operis-bio-bridge` (REST Windows, SDK NITGEN)
  - [ ] Rota `POST /crachas/:id/biometrias`
  - [ ] Match/autenticação por digital

---

## Placar final (atualizar na conclusão)

| Status | Quantidade |
|---|---|
| ✅ Migrado | 12 |
| 🟡 Parcial | 7 |
| ❌ Faltante | 16 |
| ➖ Não se aplica | 0 |

Quando todos os P0+P1 estiverem `[x]`, o sistema cobre o ciclo crítico de manufatura. P2 fecha operação + integração. P3+higiene+biometria fecha o resto.