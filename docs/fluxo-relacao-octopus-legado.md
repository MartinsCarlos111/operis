# Fluxo de Relação — Octopus (Legado)

> Análise do código localizado em `development/visao4d/octopus`, mapeando o fluxo de relação entre **Centros de Trabalho**, **Itens**, **Estabelecimentos** e o **Painel de Dados dos Coletores**.

---

## 1. Resumo da Arquitetura

- **Stack:** C# / .NET (legado em .NET Framework + API moderna em .NET 6)
- **Estilo:** Monolito em camadas
- **Fluxo de dados (camadas):**
  `Octopus.Modelo` (entidades/DTOs) → `Octopus.AcessoBanco` (DAOs com Dapper + SQL string) → `Octopus.RegraNegocio` (business, fachada `Fachada.cs`) → API (`Octopus.WebService` [ASMX/SOAP legado] e `octopus-service` [REST/JWT moderno])
- **Multi-tenant por estabelecimento:** a API moderna usa o middleware `EstabelecimentoExecution` (header HTTP customizado) — toda query filtra por `EstabelecimentoExecution.CdEstabelecimento`.
- **Dois bancos de dados distintos:**
  - `shared` (Principal): `Estabelecimento`, `Usuario`, `Area`, `Sessao`, `NivelAcesso`, notificações, etc.
  - `AutomacaoManufatura` (Manufatura): `CentroTrabalho`, `Item`, `CentroTrabalhoItem` (pivot), `Calendario`, `OrdemProducao`, `Movimento`, `CentroTrabalhoOnline`, `IOT`, `CentroTrabalhoIOT`, `Terminais`, etc.

### Estrutura de pastas principais
```
Octopus.Modelo/{Manufatura, Principal, Support}
Octopus.AcessoBanco/{Manufatura, Principal}
Octopus.RegraNegocio/{Manufatura, Principal}
octopus-service/{Controllers/{Manufatura,Principal}, Model, Helpers/Dashboard, Mappings/Middleware}
Octopus.ModeloTerminal          # contratos/DTOs dos coletores/terminais
Config/SQLServer_Scripts/{manufatura,shared}
octopus.man.wsterminais          # SOAP legado dos terminais
```

### Observação sobre "Coletores"
Existe um **produto/módulo separado** chamado "Coletores" (flag `ProdutoColetores` em `Estabelecimento` e namespace `Octopus.AcessoBanco.ColetaDados`/`ConfigCamposColetoresDAO`). Referências aparecem em `octopus-service/Helpers/ConfigCamposColetaHelper.cs`, mas esse arquivo está **excluído da compilação** (`octopus-service/octopus-service.csproj:15`). Ou seja, o produto "Coletores" tem vida parcialmente externa, mas o **conceito de coleta de dados** está plenamente representado via **dispositivos IOT**, **Terminais** e os **Monitores** que agregam os dados coletados.

---

## 2. Os 4 Domínios

### Domínio 1 — Estabelecimentos (`Estabelecimento`)
Domínio "Principal", raiz do multi-tenancy.

- **Modelo/Entidade:** `Octopus.Modelo/Principal/Estabelecimento.cs`
  - Propriedades-chave: `IdEstabelecimento`, `CdEstabelecimento`, `DsEstabelecimento`, `Ativo`, `ProdutoColetores` (linha 12), `ProdutoManufatura` (linha 13), `ProdutoChecklist` (linha 14). As flags `ProdutoX` ativam/desativam módulos por estabelecimento.
- **Entidades relacionadas:** `EstabelecimentoConsulta` (junction usuário↔estabelecimentos de consulta), `EstabelecimentoImpressora` (estab↔impressora).
- **DAO:** `Octopus.AcessoBanco/Principal/EstabelecimentoDAO.cs` (tabela `Estabelecimento`; filtra por `produtoColetores`/`produtoManufatura` em `:98-102, :132-144`).
- **RN:** `Octopus.RegraNegocio/Principal/EstabelecimentoRN.cs`.
- **Endpoints (octopus-service, REST):** `octopus-service/Controllers/Principal/Cadastros/EstabelecimentoController.cs`.
- **DTO da API:** `octopus-service/Model/EstabelecimentoModel.cs:11-12` (expõe `ProdutoColetores`/`ProdutoManufatura`).
- **Middleware multi-tenant:** `octopus-service/Mappings/Middleware/EstabelecimentoExecution.cs` e `Mappings/Middleware/ExtractCustomHeaderMiddleware.cs:32`.
- **Relação indireta com a Manufatura:** `Calendario.cs:12-26` carrega `CdEstabelecimento`; `OrdemProducao.cs:14-28` carrega `CdEstabelecimento`.

### Domínio 2 — Centros de Trabalho (`CentroTrabalho`)
Domínio "Manufatura". **Nó central do fluxo.**

- **Modelo/Entidade:** `Octopus.Modelo/Manufatura/CentroTrabalho.cs`
  - Propriedades: `IdCentroTrabalho`, `CdCentroTrabalho`, `DsCentroTrabalho`, FKs: `IdEquipamento`, `IdCalendario` (liga ao Estabelecimento), `IdGrupoMaquina`, `IdTipoCausa/Parada/Recusa/Refugo`, metas de produção/OEE.
- **Variantes do CT:**
  - `CentroTrabalhoArea.cs` (CT↔área)
  - `CentroTrabalhoFerramenta.cs` (CT↔ferramenta)
  - `CentroTrabalhoItem.cs` (pivot CT↔Item)
  - `CentroTrabalhoOnline.cs` (estado em tempo real vindo do coletor)
  - `CentrosTrabalhoIOT.cs` (CT↔dispositivo IOT/coletor)
- **DAOs:** `CentroTrabalhoDAO.cs`, `CentroTrabalhoItemDAO.cs`, `CentroTrabalhoOnlineDAO.cs`, `CentroTrabalhoIOTDAO.cs`, `CentroTrabalhoAreaDAO.cs`, `CentroTrabalhoFerramentaDAO.cs`.
  - A relação Estab→CT via `idCalendario IN (SELECT idCalendario FROM Calendario WHERE cdEstabelecimento=...)` aparece em `CentroTrabalhoDAO.cs:56-61, :71-74, :127-134, :182-191, :220-225`.
- **RN:** `Octopus.RegraNegocio/Manufatura/CentroTrabalhoRN.cs` (valida `estabelecimento.ProdutoManufatura` em `:70, :440, :488`).
- **Endpoints:** `octopus-service/Controllers/Manufatura/Cadastros/CentrosTrabalhoController.cs` (rota `api/CentrosTrabalho`), `CentroTrabalhoItemController.cs`, `CentroTrabalhoAreaController.cs`, `CentroTrabalhoFerramentaController.cs`, `CentroTrabalhoIOTController.cs` (`api/CentroTrabalhoIOT`).

### Domínio 3 — Itens (`Item`)
Domínio "Manufatura". O termo usado no código é **`Item`** (produto).

- **Modelo/Entidade:** `Octopus.Modelo/Manufatura/Item.cs` — `IdItem`, `CdItem`, `DsItem`, `QualidadesItem`.
- **Pontos de uso:**
  - Referenciado por `CentroTrabalhoItem` (pivot)
  - Referenciado por `OrdemProducao` via `OrdemProducao.cs:45` `CdItem` (código desnormalizado)
  - Referenciado por `QualidadeItem`
- **DAO:** `Octopus.AcessoBanco/Manufatura/ItemDAO.cs`.
- **RN:** `Octopus.RegraNegocio/Manufatura/ItemRN.cs`, `QualidadeItemRN.cs`.
- **Endpoints:** `octopus-service/Model/Manufatura/ItemModel.cs` (DTO); exposto via `CentroTrabalhoItemController.cs` e referenciado em `OrdemProducaoController.cs`.
- **Schema SQL:** `Config/SQLServer_Scripts/manufatura/atualizacao/v5.0.0.0/20241230_#TP2277_0_Item_create.sql:9` (`CREATE TABLE Item`).

### Domínio 4 — Painel de Dados dos Coletores (IOT + Terminais + Monitores/Dashboard)
O "coletor" tem duas facetas: (a) o **dispositivo físico** (IOT ou Terminal na borda) e (b) o **painel/agregador** que consome os dados coletados. Ambas existem no código.

#### (a) Dispositivos coletores (borda)
- **IOT (hardware):** `Octopus.Modelo/Manufatura/IOT.cs` — `IdIOT`, `SerialIOT`, `IP`, `Model`, `FirmwareVersion` (hardware coletor de sinais da máquina).
- **Vínculo CT↔IOT:** `CentrosTrabalhoIOT.cs` e tabela `CentroTrabalhoIOT` (SQL `20250723_#IND33_0_CentroTrabalhoIOT_create.sql:9-22`, FKs `idCentroTrabalho→CentroTrabalho` e `idIOT→IOT`). Os dados de telemetria (temperatura, velocidade, pressão, carga) ficam em `CentroTrabalhoOnline` (`CentroTrabalhoOnline.cs:44-47`).
- **ConfigIOT:** `Octopus.Modelo/Manufatura/ConfigIOT.cs` (configura canais/inputs do coletor IOT).
- **Terminais (aplicativo de chão de fábrica):** `Octopus.Modelo/Manufatura/Terminais.cs` (tabela `Terminais`, SQL `20231211_#TP1850_1_Terminais_create.sql:9`); projeto `Octopus.ModeloTerminal` com contratos (`Contratos/Terminal/IReporteTerminalService.cs`) e DTOs de coleta (`Model/Terminal/MovimentoTerminalModel.cs`, `CentroTrabalhoTerminal.cs`, `StatusCentroTrabalhoModel.cs`, `DadosTerminalModel.cs`).
- **Ponto de entrada SOAP legado:** `octopus.man.wsterminais/WsTerminais.asmx.cs` — serviço ASMX chamado pelos terminais/coletores (autenticação por `SoapHeader`, métodos `testarConexao`, `atualizarSessaoUsuario`, envio de movimentos/apontamentos). É registrado como módulo `EnumTipoModulo.WebServiceTerminais` (`StatusSistemaController.cs:172-173`).
- **Dado coletado (entidade central):** `Octopus.Modelo/Manufatura/Movimento.cs` — o apontamento de produção: FKs para `OrdemProducao`, `CentroTrabalho` (`:56-70`), `Usuario`, `Turno`, `TipoParada/Refugo/Causa/Recusa`; quantidades produzidas/refugadas/perda; tempos; integração ERP. DAO em `Octopus.AcessoBanco/Manufatura/MovimentosDAO.cs`.

#### (b) Painel/agregador — consumidor dos dados coletados (todos em `octopus-service`)
- **Monitores (online/real-time):** `octopus-service/Controllers/Manufatura/Monitores/`
  - `CTOnlineController.cs` (rota `api/CTOnline`) — painel Online do Centro de Trabalho: `BuscaPorEstabecimento`, `BuscaDadosCentroTrabalhOnline` (gauge OEE/Disponibilidade/Eficiência/Qualidade lendo `CentroTrabalhoOnline` + `Movimento`), `BuscaDadosOrdemProducao`, `BuscaDadosTurno`. Sempre filtra por `EstabelecimentoExecution.CdEstabelecimento`.
  - `CompletoOnlineController.cs`, `IndicadoresOnlineController.cs`, `IndicadoresController.cs`, `AcompanhamentoProducaoController.cs`, `DisponivelProduzindoParadaController.cs`, `MonitorEtiquetasController.cs` etc.
- **Dashboard (cards agregados):** `octopus-service/Controllers/Principal/DashboardController.cs` (rotas `api/Dashboard/GetPrincipal`, `api/Dashboard/GetManufatura`) → usa `Helpers/Dashboard/DashboardManufaturaHelper.cs` (agrega divergências, movimentos por tipo, tempos de integração, status de serviços — `:45-185`) e `DashboardPrincipalHelper.cs` (status de módulos). DTOs em `octopus-service/Model/Dashboard/{CardModel,CampoCardModel,ProdutoModel}.cs`.
- **Status do sistema/painel de monitoria:** `octopus-service/Controllers/Principal/Monitores/StatusSistemaController.cs` (`GetMonitoresStatus` percorre `EnumProduto.PRINCIPAL`/`MANUFATURA` e reporta status de cada serviço/integração, inclusive `WebServiceTerminais`), `DivergenciasController.cs`, `LogConexaoController.cs`, `UsuariosOnlineController.cs`.
- **DAOs do painel online:** `Octopus.AcessoBanco/Manufatura/CentroTrabalhoOnlineDAO.cs` (lê `CentroTrabalhoOnline` filtrando por estabelecimento via `Calendario`), `IndicadoresOnlineDAO.cs`, `IndicadoresIOTDAO.cs`, `DisponivelProduzindoParadaDAO.cs`, `DiarioDeBordoDAO.cs`.
- **RN do painel:** `Octopus.RegraNegocio/Manufatura/CentroTrabalhoOnlineRN.cs`, `CalculoIndicadoresRN.cs`, `DisponivelProduzindoParadaRN.cs`, `TerminalRN.cs`.
- **Observação:** a flag `Estabelecimento.ProdutoColetores` (e o namespace `Octopus.AcessoBanco.ColetaDados`/`ConfigCamposColetoresDAO`, visível no helper **não compilado** `octopus-service/Helpers/ConfigCamposColetaHelper.cs:1,25`) indica que existe um produto "Coletores" separado; neste repo, a coleta/consolidação efetiva de dados dos coletores ocorre via IOT/Terminais + Movimento + Monitores.

---

## 3. Mapeamento de Relacionamentos (explícito)

| Relação | Cardinalidade | Como se dá | Evidência |
|---|---|---|---|
| `Estabelecimento` → `Calendario` | 1 : N | `Calendario.cdEstabelecimento` | `Calendario.cs:12-26`; `CentroTrabalhoDAO.cs:59,72,134,185,210,223` |
| `Calendario` → `CentroTrabalho` | 1 : N | `CentroTrabalho.idCalendario` | `CentroTrabalho.cs:26-39`; pivot em todos os DAOs |
| `Estabelecimento` → `CentroTrabalho` | 1 : N **INDIRETO via `Calendario`** | query `idCalendario IN (SELECT idCalendario FROM Calendario WHERE cdEstabelecimento=...)` | `CentroTrabalhoDAO.cs:56-61, 182-193`; `CentroTrabalhoOnlineDAO.cs:50,63,76,89,105,126-127` |
| `Estabelecimento` → `OrdemProducao` | 1 : N **DIRETO** | `OrdemProducao.cdEstabelecimento` | `OrdemProducao.cs:14-28` |
| `CentroTrabalho` ↔ `Item` | **N : M via pivot `CentroTrabalhoItem`** | FK `idCentroTrabalho` + FK `idItem` + dados de ciclo produtivo | `CentroTrabalhoItem.cs`; SQL `20250101_#TP2278_0_CentroTrabalhoItem_create.sql:9-32` (FKs cascade); `CentroTrabalhoItemDAO.cs:23-25, 151-178` |
| `OrdemProducao` → `CentroTrabalho` | N : 1 | `OrdemProducao.idCentroTrabalho` | `OrdemProducao.cs:47-61` |
| `OrdemProducao` → `Item` | N : 1 (denormalizado por código) | `OrdemProducao.CdItem` (string — código, não FK numérica) | `OrdemProducao.cs:45` |
| `CentroTrabalho` ↔ `IOT` (coletor) | **1 : 1 (até N) via `CentroTrabalhoIOT`** | `idCentroTrabalho→CentroTrabalho`, `idIOT→IOT` | SQL `20250723_#IND33_0_CentroTrabalhoIOT_create.sql:9-22`; `IOT.cs`; `CentrosTrabalhoIOT.cs` |
| `CentroTrabalho` → `CentroTrabalhoOnline` | 1 : 1 (snapshot online) | `CentroTrabalhoOnline.idCentroTrabalho` | `CentroTrabalhoOnlineDAO.cs:23-45`; `CentroTrabalhoOnline.cs:8-22` |
| `CentroTrabalho` → `Movimento` | 1 : N (apontamentos coletados) | `Movimento.idCentroTrabalho` | `Movimento.cs:56-70`; `CentroTrabalhoDAO.cs:235-253` (JOIN OrdemProducao×Movimento×Historico) |
| `OrdemProducao` → `Movimento` | 1 : N | `Movimento.idOrdemProducao` | `Movimento.cs:10-24` |
| `Movimento` → `Item` | N : 1 indireto via `OrdemProducao.CdItem` | dado coletado refere-se ao item da ordem | `CTOnlineController.cs:242-243` |
| `Estabelecimento` → `ProdutoColetores` | 1 : 1 (flag) | ativa o módulo/painel de coletores | `Estabelecimento.cs:12`; `EstabelecimentoDAO.cs:98-100` |
| `Usuario` → `Estabelecimento` | N : 1 (+ `EstabelecimentoConsulta` para usuários multi-estab) | `Usuario.idEstabelecimento` / `EstabelecimentoConsulta.idUsuario` | `EstabelecimentoDAO.cs:138-140` |

> **Não há entidade residual "Coletor" isolada** — o conceito de coletor se materializa em `IOT` (hardware), `Terminais` (aplicativo de borda) e `Movimento`/`CentroTrabalhoOnline` (dados coletados). O **`CentroTrabalho` é o nó central** que une os 4 domínios.

---

## 4. Fluxo de Dados dos Coletores (painel agrega os 3 domínios)

```
1. Dispositivo físico atrelado ao centro de trabalho
   Um coletor IOT é associado a um CentroTrabalho via tabela CentroTrabalhoIOT
   (idCentroTrabalho↔idIOT). O IOT lê sinais da máquina (temperatura, velocidade,
   pressão, ciclos); sua configuração de canais está em ConfigIOT.
   Evidência: IOT.cs, ConfigIOT.cs, CentrosTrabalhoIOT.cs;
   SQL 20250722_#IND33_0_IOT_create.sql, 20250723_#IND33_0_CentroTrabalhoIOT_create.sql.

2. Captura/envio do apontamento
   O terminal/aplicativo de chão de fábrica (DTOs em Octopus.ModeloTerminal/
   Model/Terminal/MovimentoTerminalModel.cs; contrato IReporteTerminalService.cs:9-15
   com IniciarMovimentoProducao, FinalizarMovimentoProducao, ApontarProducao) envia
   os dados ao serviço WsTerminais.asmx (SOAP legado, octopus.man.wsterminais/
   WsTerminais.asmx.cs), que os valida e os persiste como Movimento (tabela Movimento
   no banco Manufatura) e atualiza CentroTrabalhoOnline (snapshot de estado online).

3. Agregação/Painel
   Monitores em octopus-service/Controllers/Manufatura/Monitores/ (rota api/CTOnline
   em CTOnlineController.cs calcula OEE/Disponibilidade/Eficiência) + DashboardController.cs
   via Helpers/Dashboard/DashboardManufaturaHelper.cs — tudo filtrado por
   EstabelecimentoExecution.CdEstabelecimento (que denormaliza o ID do item no Movimento).
```

---

## 5. Diagrama Textual do Fluxo

```
        ┌─────────────────────────────┐
        │     ESTABELECIMENTO        │  (multi-tenant; ProdutoColetores/ProdutoManufatura)
        └──┬───────────────┬─────────┘
   via Calendario   via OrdemProducao.cdEstabelecimento
           │                │
           ▼                ▼
    ┌──────────────┐  ┌────────────────┐
    │ CENTRO TRAB. │<─│ ORDEM PRODUÇÃO │ .CdItem (denormalizado)
    └──┬───┬───┬───┘  └────────────────┘
       │   │   │                       │
       │   │   └──(pivot N:M)──>┌──────▼──────┐
       │   │                    │    ITEM     │
       │   └──(1:1 via CT-IOT)─>┌─────────────┐
       │                        │  IOT(coletor)│
       │                        └──────┬──────┘
       │                               │ telemetria
       ▼                               ▼
  ┌─────────────────┐           ┌──────────────┐
  │CentroTrabalho   │           │  TERMINAIS   │ ─ SOAP WsTerminais.asmx
  │ Online(snapshot)│           └──────┬───────┘
  └────────┬────────┘                  │ apontamento
           │                           ▼
           └─────lê─────>      ┌─────────────────┐
                               │    MOVIMENTO    │  (dado coletado central)
                               └────────┬─────────┘
                                        │
                                        ▼
                           ┌────────────────────────────┐
                           │ PAINEL: Monitores +        │
                           │ Dashboard (octopus-service)│  <- agregado por estab
                           └────────────────────────────┘
```

### Resumo do caminho de dados
```
Estabelecimento ──(via Calendario)──> CentroTrabalho ──(pivot CentroTrabalhoItem)──> Item
                                          │
                                          ├──(CentroTrabalhoIOT)──> IOT (coletor físico) ── telemetria ──┐
                                          │                                                              │
                                          ├──(snapshot)──> CentroTrabalhoOnline                        │
                                          │                                                              ▼
                                          └──(1:N)──> Movimento  <── apontamento ── Terminais (SOAP) ──#Painel
                                                              │
                                                              ▼
                                          Painel (Monitores + Dashboard) — filtra por Estabelecimento
```

---

## 6. Arquivos-chave para entender o fluxo (Top 15)

| # | Arquivo | Por quê |
|---|---|---|
| 1 | `Octopus.Modelo/Principal/Estabelecimento.cs` | Tenancy + flags `ProdutoColetores`/`ProdutoManufatura` |
| 2 | `Octopus.Modelo/Manufatura/CentroTrabalho.cs` | Entidade central do fluxo |
| 3 | `Octopus.Modelo/Manufatura/Item.cs` | Itens |
| 4 | `Octopus.Modelo/Manufatura/CentroTrabalhoItem.cs` | Pivot CT↔Item |
| 5 | `Octopus.Modelo/Manufatura/IOT.cs` + `CentrosTrabalhoIOT.cs` | Coletor físico e vínculo ao CT |
| 6 | `Octopus.Modelo/Manufatura/Terminais.cs` | App de borda |
| 7 | `Octopus.Modelo/Manufatura/Movimento.cs` | Apontamento coletado (centro do fluxo) |
| 8 | `Octopus.Modelo/Manufatura/CentroTrabalhoOnline.cs` | Snapshot online |
| 9 | `Octopus.Modelo/Manufatura/Calendario.cs` | Ponte Estab→CT |
| 10 | `Octopus.Modelo/Manufatura/OrdemProducao.cs` | Liga CT + Item por estabelecimento |
| 11 | `Octopus.AcessoBanco/Manufatura/CentroTrabalhoDAO.cs` | Contém a query-relação Estab→CT (linhas 56-61, 182-193) |
| 12 | `Octopus.AcessoBanco/Manufatura/CentroTrabalhoItemDAO.cs` | CRUD do pivot CT↔Item |
| 13 | `Octopus.AcessoBanco/Manufatura/CentroTrabalhoOnlineDAO.cs` | Dados do painel online |
| 14 | `octopus-service/Mappings/Middleware/EstabelecimentoExecution.cs` + `ExtractCustomHeaderMiddleware.cs` | Middleware multi-tenant |
| 15 | `octopus-service/Controllers/Manufatura/Monitores/CTOnlineController.cs` + `octopus-service/Helpers/Dashboard/DashboardManufaturaHelper.cs` | Painel online (OEE/gauges) e cards agregados |

---

## 7. Observações Importantes

- **`CentroTrabalho` é o nó central** que une os 4 domínios.
- O nome "artigo" não existe no código — é **`Item`**.
- "Coletores" não tem entidade única — se materializa em **`IOT` (hardware) + `Terminais` (app de borda) + `Movimento`/`CentroTrabalhoOnline` (dados coletados)**.
- Existe um produto "Coletores" separado (flag `Estabelecimento.ProdutoColetores` + namespace `Octopus.AcessoBanco.ColetaDados`), mas o helper `octopus-service/Helpers/ConfigCamposColetaHelper.cs` está **excluído da compilação** (`octopus-service.csproj:15`), indicando que esse produto é parcialmente externo — neste repo a coleta de dados é feita via IOT/Terminais/Movimento.
- O relacionamento `Estabelecimento → CentroTrabalho` é **indireto via `Calendario`** (não há FK direta entre as duas tabelas); toda query usa subselect em `Calendario`.
- O relacionamento `OrdemProducao → Item` é **denormalizado por código** (`CdItem` string), não por FK numérica — pode haver inconsistências se o código do item mudar.
- Os pivots com cascata (`CentroTrabalhoItem` com `ON DELETE CASCADE`) implicam que ao excluir um `CentroTrabalho` ou `Item`, os vínculos são removidos automaticamente.

---

## Referências de Schema SQL

- `Config/SQLServer_Scripts/manufatura/atualizacao/v5.0.0.0/20241230_#TP2277_0_Item_create.sql:9` — `CREATE TABLE Item`
- `Config/SQLServer_Scripts/manufatura/atualizacao/v5.0.0.0/20250101_#TP2278_0_CentroTrabalhoItem_create.sql:9-32` — `CREATE TABLE CentroTrabalhoItem` (pivot com FKs cascade)
- `Config/SQLServer_Scripts/manufatura/atualizacao/v5.0.0.0/20250722_#IND33_0_IOT_create.sql` — `CREATE TABLE IOT`
- `Config/SQLServer_Scripts/manufatura/atualizacao/v5.0.0.0/20250723_#IND33_0_CentroTrabalhoIOT_create.sql:9-22` — `CREATE TABLE CentroTrabalhoIOT`
- `Config/SQLServer_Scripts/manufatura/atualizacao/v5.0.0.0/20231211_#TP1850_1_Terminais_create.sql:9` — `CREATE TABLE Terminais`
- `Config/SQLServer_Scripts/manufatura/instalacao/manufatura_v4.3.2.0.sql` — defines `CentroTrabalho`, `Calendario`, `Movimento`, `CentroTrabalhoOnline`, etc.