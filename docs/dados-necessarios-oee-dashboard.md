# Dados necessários para o OEE real no dashboard de Centro de Trabalho

O dashboard em **Manufatura → Monitores → Coletores IoT → [Centro de Trabalho]**
(`operis-front/src/components/iot/PainelOeeMock.tsx`) mostra Eficiência/OEE
por coletor com **dado simulado** (`operis-front/src/lib/oee-mock.ts`), com um
badge "Dado simulado" sempre visível. Este documento explica por quê, e o que
falta para trocar o mock pelo cálculo real.

## O backend já calcula OEE de verdade — só falta alimentá-lo

A fórmula (Disponibilidade × Performance × Qualidade = OEE) está implementada
e correta em
[`calculo-indicadores.ts`](../src/modules/indicadores/domain/entities/calculo-indicadores.ts),
persistida a cada 10s pelo
[`IndicadoresWorker`](../src/modules/indicadores/worker/indicadores-worker.ts)
na tabela `calculos_indicadores`. O problema não é lógica — é dado de entrada.

## A cadeia real de dados

```
Apontamento manual/terminal (HTTP)
        ↓
    Movimento (tabela)
        ↓
IndicadoresWorker (tick de 10s)
        ↓
CalculoIndicadores (oee, disponibilidade, eficiencia, qualidade, teep)
```

O `IndicadoresWorker` busca `Movimento` na janela do turno corrente
([`prisma-fonte-movimentos.ts`](../src/modules/indicadores/infrastructure/persistence/prisma-fonte-movimentos.ts)).
Sem `Movimento` no período, `MontarOeeService.montarPorTurno` retorna `null`
e **não grava nada** — não é um valor zerado, é ausência de linha.

## O pipeline de coletores IoT é desconectado desse cálculo

`LeituraIot` (o que os coletores enviam via MQTT/RabbitMQ) nunca vira
`Movimento`. Não existe hoje nenhum conversor/consumidor que traduza uma
leitura de porta em um apontamento de produção. O
[`IotWorker`](../src/modules/iot/worker/iot-worker.ts) e o
`IndicadoresWorker` rodam como processos totalmente independentes, sem ponte
entre si.

Ou seja: **um coletor sozinho, por mais que esteja mandando dado
corretamente, nunca gera OEE.** É preciso apontamento manual de produção.

## O que falta hoje no tenant "teste" especificamente

Verificado em 2026-08-06: `Movimento` e `CalculoIndicadores` estão com **zero
linhas** no banco do tenant, apesar de já existir 1 `OrdemProducao` e 1
`Turno` cadastrados. Para o `IndicadoresWorker` produzir uma linha de
`CalculoIndicadores` não-zerada para o centro de trabalho "teste", falta:

1. **Confirmar que o Turno cadastrado cobre o horário testado** — o worker só
   processa um centro se a janela do turno (`inicioMinutos`/`fimMinutos`,
   `diasSemana`) englobar o momento atual.
2. **Ao menos um `Movimento` não-cancelado** na janela do turno, do dia — sem
   isso o cálculo nem roda para aquele centro.
3. **`Movimento` do tipo `REPORTE`**, com `ordemProducaoId` apontando para a
   `OrdemProducao` já existente — soma `qtdProduzida` (Qualidade e
   Performance dependem disso). `REFUGO` é opcional, soma `qtdRefugo`.
4. **`Movimento` do tipo `PARADA`** (opcional) — sem nenhum, a Disponibilidade
   fica sempre próxima de 100%, o que pode não refletir a realidade.
5. Os movimentos de produção (`REPORTE`/`REFUGO`) **exigem `ordemProducaoId`
   válido** — `PARADA`/`ALERTA`/`RECUSA`/`TROCA_FERRAMENTAL`/`TROCA_TURNO`
   dispensam ordem (ver `DISPENSAM_ORDEM` em
   [`movimento.ts`](../src/modules/manufatura/domain/entities/movimento.ts)).

`Movimento` é criado via `RegistrarMovimentoUseCase`, acionado pela rota HTTP
de manufatura (apontamento manual/terminal) — não há endpoint que aceite
"simular movimento" fora do fluxo normal de apontamento.

## Dois caminhos possíveis (não implementados neste trabalho)

**(a) Manter apontamento manual como fonte de verdade.** Nenhuma mudança de
código — só cadastrar movimentos de teste no tenant via a rota/tela normal de
apontamento, e o OEE passa a ser calculado organicamente pelo pipeline já
existente.

**(b) Construir um conversor `LeituraIot → Movimento`.** Faria o OEE nascer
automaticamente a partir de sinais de coletores IoT — por exemplo, uma porta
com Contexto `PRODUZINDO_NAO_PRODUZINDO` virando abertura/fechamento de um
`Movimento` tipo `REPORTE`/`PARADA` automaticamente. Esse é um projeto de
escopo maior (regras de negócio de quando abrir/fechar movimento, de onde vem
a quantidade produzida, etc.) — não coberto por este dashboard, é uma decisão
de arquitetura para avaliar separadamente.

Até que uma dessas opções seja resolvida, o painel de OEE no dashboard
continuará mockado.
