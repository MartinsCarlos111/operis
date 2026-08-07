# Configuração de entradas do coletor IoT

Este documento explica o que cada campo da tela **Manufatura → Configurações →
Centro de Trabalho IoT** significa de fato para o coletor físico. A
configuração salva não fica só no banco do operis — ao clicar em "Salvar
configuração", ela é publicada via RabbitMQ para o coletor, que aplica os
valores nos pinos e reinicia. Por isso os valores precisam ser exatamente os
que o firmware espera, não rótulos livres.

O hardware tem **5 portas fixas**: `DI1`-`DI4` são digitais (entradas 1 a 4) e
`AI1` é a única porta analógica (entrada 5). Não dá para ter mais que isso —
é o limite físico do coletor atual.

## Tipo (modo elétrico do sensor)

Define **como o pino do coletor detecta o pulso/sinal do sensor** — é
eletricidade, não é sobre digital/analógica (isso quem decide é a porta).

| Valor | O que faz |
|---|---|
| **PNP** | O pino dispara na borda de subida do sinal (RISING) — sensor que sobe para 24V/5V quando ativado. |
| **NPN** | O pino dispara na borda de descida do sinal (FALLING) — sensor que cai para 0V quando ativado. |
| **Change PNP** | Dispara em qualquer transição (sobe ou desce) — usado quando o sensor é PNP mas você precisa contar ambas as bordas. |
| **Change NPN** | Mesma ideia do Change PNP, para sensores NPN. |

Se você não souber o tipo do sensor físico instalado na porta, esse campo
errado faz o coletor simplesmente não contar (ou contar dobrado) os pulsos —
vale conferir a etiqueta/datasheet do sensor.

## Contexto (o que o valor da porta representa)

Diz ao firmware **o que calcular** com os pulsos recebidos. A lista muda
conforme a porta:

### Portas digitais (DI1-DI4)

| Valor | Cálculo feito no coletor |
|---|---|
| **Ligada/Desligada** | Inverte um estado a cada pulso (liga/desliga um flag). Sem parâmetros. |
| **Produzindo/Não produzindo** | Lê o estado atual do pino (ligado ou desligado) — é o "está rodando agora?" da máquina. Sem parâmetros. |
| **Genérico** | Só repassa um valor bruto configurado, sem cálculo. Sem parâmetros. |
| **Velocidade angular** | `(2π × pulsos) / (Param 2 × 10)` — pulsos por volta em Param 2. |
| **Velocidade linear** | `(π × pulsos × Param 1) / Param 2` — Param 1 é o diâmetro da roda/polia, Param 2 os pulsos por volta. |
| **Contagem de ciclos** | `pulsos / Param 2` — divide o total de pulsos pelos pulsos-por-ciclo (Param 2). |
| **Contagem de itens** | Conta pulsos como itens, 1 pulso = 1 item. Sem parâmetros. |
| **Metros produzidos** | `π × Param 1 × (pulsos / Param 2)` — Param 1 é o diâmetro, Param 2 os pulsos por volta. |
| **Volume produzido** | Pega o resultado de "Metros produzidos" e multiplica por Param 3 (área da seção transversal, por exemplo). |
| **Tempo decorrido** | Tempo (em segundos) desde o último evento nessa porta. Sem parâmetros. |

### Porta analógica (AI1)

Só aparecem quando a entrada é a porta 5 **e** o toggle "Analógica como
digital" está desligado — a leitura vem da tensão do sensor, não de pulsos:

| Valor | Uso típico |
|---|---|
| **Temperatura** | Sensor de temperatura (termopar, PT100 com transmissor 4-20mA, etc). |
| **Pressão** | Transdutor de pressão. |
| **Percentual** | Qualquer grandeza que faça sentido como 0-100%. |
| **Vibração** | Acelerômetro/sensor de vibração com saída analógica. |
| **Vazão volumétrica** | Medidor de vazão (m³/h, L/min). |
| **Vazão mássica** | Medidor de vazão por massa (kg/h). |
| **Distância** | Sensor de distância/nível analógico. |
| **Corrente** | Sensor de corrente elétrica (amperímetro de painel, TC com transmissor). |

Nesses 8 contextos, a leitura é a tensão do pino convertida por
`map(tensão, Param 1, Param 2, Param 3, Param 4)` — ou seja, **Param 1-2**
definem a faixa de tensão de entrada esperada e **Param 3-4** a faixa de valor
de saída correspondente (ex.: 0-3.3V mapeado para 0-100°C).

### Toggle "Analógica como digital"

Só existe na porta 5. Quando ligado, a porta analógica passa a se comportar
como uma porta digital comum: usa a mesma lista de 10 contextos digitais
(Ligada/Desligada, Produzindo/Não produzindo, etc.) e os mesmos cálculos —
útil quando o sensor ligado na porta analógica na verdade só gera pulsos
digitais.

## Função (como o pulso/sinal é interpretado)

Diz ao firmware **como contar** o evento elétrico, independente do que ele
representa (Contexto).

| Valor | Significado |
|---|---|
| **Pulso** | Cada borda detectada (conforme o Tipo) conta como um evento — é o modo padrão para contadores. |
| **Acionado** | Lê o estado atual do pino (ligado/desligado), não conta bordas — usado com o contexto "Ligada/Desligada" ou "Produzindo/Não produzindo". |
| **Encoder** | Modo de leitura de encoder — combinado com o contexto "Velocidade linear", usa o tempo decorrido em vez de contagem de pulsos para calcular a velocidade. |
| **Pulso (início)** | Marca o início de um evento de duração (par com "Pulso (fim)"). |
| **Pulso (fim)** | Marca o fim do evento iniciado por "Pulso (início)" — a diferença de tempo entre os dois vira a medição. |

## Param. 1 a Param. 4

Não têm nome fixo nem significado próprio — são 4 campos numéricos livres que
o firmware **reaproveita de forma diferente conforme o Contexto** escolhido
na mesma entrada. O mesmo `Param 1` vira "diâmetro da roda" num contexto e
"tensão mínima" noutro; a tela não dá nomes específicos a eles por isso.

### Referência rápida por Contexto

| Contexto | Param 1 | Param 2 | Param 3 | Param 4 |
|---|---|---|---|---|
| Ligada/Desligada | — | — | — | — |
| Produzindo/Não produzindo | — | — | — | — |
| Genérico | — | — | — | — |
| Contagem de itens | — | — | — | — |
| Tempo decorrido | — | — | — | — |
| Velocidade angular | — | pulsos por volta | — | — |
| Contagem de ciclos | — | pulsos por ciclo | — | — |
| Velocidade linear | diâmetro da roda/rolete | pulsos por volta | — | — |
| Metros produzidos | diâmetro da roda/rolete | pulsos por volta | — | — |
| Volume produzido | diâmetro da roda/rolete | pulsos por volta | área da seção | — |
| Temperatura / Pressão / Percentual / Vibração / Vazão volumétrica / Vazão mássica / Distância / Corrente (porta analógica, sem "como digital") | tensão mínima lida | tensão máxima lida | valor real na tensão mínima | valor real na tensão máxima |

"—" significa que o campo não é usado pelo firmware nesse contexto — pode
deixar em branco sem problema.

### Casos especiais

- **Contextos analógicos** (porta 5, sem "Analógica como digital"): os 4
  parâmetros são **obrigatórios juntos** — formam a régua de conversão
  `map(tensão, Param 1, Param 2, Param 3, Param 4)`. Exemplo: sensor de
  temperatura que manda 0V–3.3V para 0°C–100°C → Param 1=`0`, Param 2=`3300`
  (em milivolts), Param 3=`0`, Param 4=`100`. Sem os 4 preenchidos, a leitura
  sempre retorna 0.
- **Param 2 é divisor** em vários contextos (Velocidade angular, Contagem de
  ciclos, Velocidade linear, Metros produzidos, Volume produzido) — o
  firmware calcula `pulsos / Param 2`. Deixá-lo vazio ou `0` nesses contextos
  quebra o cálculo (divisão por zero); nesses casos o campo é obrigatório,
  mesmo a tela não impondo isso.
- Fora desses casos, se o Contexto não aparece usando um parâmetro na tabela
  acima, pode deixar todos em branco — o firmware ignora o que não precisa.

## Cenários prontos

Receitas de configuração para os casos de uso mais comuns em chão de fábrica.
Cada uma assume um sensor já instalado na porta — o que muda entre PNP e NPN
é só a fiação do sensor (positivo pulsando ou negativo pulsando); confira o
datasheet se não tiver certeza.

### Contar peças (sensor indutivo/fotoelétrico contando unidades)

Sensor de proximidade detecta cada peça passando por uma esteira/prensa e
pulsa uma vez por peça. Você quer o total de peças no período.

| Campo | Valor |
|---|---|
| Porta | Uma das digitais (DI1-DI4) |
| Tipo | **PNP** (mais comum em sensores industriais) ou **NPN**, conforme o sensor |
| Contexto | **Contagem de itens** |
| Função | **Pulso** |
| Param. 1-4 | Não usa — deixe em branco |

Cada pulso vira +1 no contador da porta. Aparece direto em "Total" na tela de
Monitoramento de Coletores.

**Variante — contando por volta de um eixo/roda dentada** (ex.: sensor no
eixo de uma engrenagem, cada volta = N peças): use **Contagem de ciclos** em
vez de **Contagem de itens**, e preencha **Param 2** com o número de pulsos
que o sensor gera por volta completa. O firmware divide o total de pulsos por
esse número antes de contar.

### Ligada ou Desligada (estado da máquina / equipamento ligado)

Sensor de presença de energia, chave fim-de-curso, ou saída de um CLP
indicando se o equipamento está ligado. Você quer saber o estado atual, não
contar pulsos.

| Campo | Valor |
|---|---|
| Porta | Uma das digitais (DI1-DI4) |
| Tipo | **PNP** ou **NPN**, conforme o sensor |
| Contexto | **Ligada/Desligada** (alterna a cada mudança de estado) ou **Produzindo/Não produzindo** (lê o nível atual do pino — mais indicado se o sinal for um nível constante, não um pulso) |
| Função | **Acionado** |
| Param. 1-4 | Não usa — deixe em branco |

Use **Produzindo/Não produzindo** quando o sinal do sensor é um nível (24V
enquanto ligado, 0V enquanto desligado) — é o caso mais comum para "máquina
rodando". Use **Ligada/Desligada** só se o sinal for um pulso de toggle (liga
com um pulso, desliga com o próximo).

### Problema (alarme, parada, sensor de falha)

O firmware não tem um contexto dedicado a "falha" — o mecanismo é o mesmo de
"Ligada ou Desligada" acima, aplicado a um sinal de alarme/defeito em vez de
um sinal de produção. A interpretação ("isso é uma falha") fica por conta do
Label da entrada e de quem lê o contador depois, não de um campo específico.

| Campo | Valor |
|---|---|
| Porta | Uma das digitais (DI1-DI4) |
| Tipo | **PNP** ou **NPN**, conforme o sensor de alarme |
| Contexto | **Produzindo/Não produzindo** (lê o nível: alarme ativo = 1, normal = 0) |
| Função | **Acionado** |
| Label | Algo descritivo, ex. `"Alarme de superaquecimento"` ou `"Sensor de porta aberta"` — é o texto que aparece na tela, o sistema não infere o significado sozinho |
| Param. 1-4 | Não usa — deixe em branco |

Se o que você quer é **contar quantas vezes** o alarme disparou no período
(em vez de só o estado atual), troque Contexto para **Contagem de itens** e
Função para **Pulso** — cada acionamento do alarme vira +1, como no cenário
de contar peças.

### Velocidade de um eixo/esteira (RPM ou m/min)

Sensor detecta pulsos a cada volta (ou fração de volta) de um eixo/rolete
motorizado.

| Campo | Valor |
|---|---|
| Porta | Uma das digitais (DI1-DI4) |
| Tipo | **PNP** ou **NPN** |
| Contexto | **Velocidade angular** (RPM/rad por segundo) ou **Velocidade linear** (m/min, se o eixo move um material) |
| Função | **Pulso**, ou **Encoder** se o sensor for um encoder incremental |
| Param. 1 | Só para Velocidade linear: diâmetro da roda/rolete (em metros) |
| Param. 2 | Pulsos por volta do sensor/encoder (obrigatório — o cálculo divide por ele) |

### Tempo de ciclo (duração de uma operação)

Um sensor marca o início da operação (ex.: fechamento de um molde) e outro
(ou o mesmo, com lógica de início/fim) marca o fim.

| Campo | Valor |
|---|---|
| Porta | Uma digital para início, outra para fim (ou a mesma porta com Função alternando) |
| Contexto | **Tempo decorrido** |
| Função | **Pulso (início)** na entrada de início, **Pulso (fim)** na de fim |
| Param. 1-4 | Não usa — deixe em branco |

A leitura publicada é o tempo em segundos entre o pulso de início e o de fim.

### Temperatura/pressão de um sensor analógico (4-20mA ou 0-10V)

Sensor industrial com saída analógica (via transmissor) ligado na porta 5
(AI1).

| Campo | Valor |
|---|---|
| Porta | 5 (AI1) — única porta analógica |
| Analógica como digital | **Desligado** |
| Tipo | Não é usado para essa leitura (mas precisa de um valor válido — deixe PNP) |
| Contexto | **Temperatura**, **Pressão**, ou o que for equivalente à grandeza do sensor |
| Função | Não é usado para essa leitura (mas precisa de um valor válido — deixe Pulso) |
| Param. 1 | Tensão mínima lida pelo coletor (ex.: `0` para 0V) |
| Param. 2 | Tensão máxima lida pelo coletor (ex.: `3300` para 3.3V, em milivolts) |
| Param. 3 | Valor mínimo real do sensor na tensão mínima (ex.: `0` para 0°C) |
| Param. 4 | Valor máximo real do sensor na tensão máxima (ex.: `100` para 100°C) |

O firmware converte a tensão lida para o valor real com
`map(tensão, Param 1, Param 2, Param 3, Param 4)` — os 4 parâmetros são
obrigatórios aqui, sem eles a leitura sempre retorna 0.
