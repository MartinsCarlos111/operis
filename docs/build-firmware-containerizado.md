# Build de firmware containerizado (proposta)

Este documento descreve como containerizar o build do firmware dos coletores
IoT, para não depender de instalar Python/PlatformIO na máquina de quem
precisa gerar um `.bin` novo. É uma proposta — nada aqui está implementado
ainda. Para o fluxo de upload/OTA já existente no operis, ver
[atualizacao-firmware-iot.md](atualizacao-firmware-iot.md).

## Problema que resolve

Gerar o `.bin` hoje exige PlatformIO Core instalado localmente (ou a
extensão do VS Code, que embute o próprio Python). Em qualquer máquina/CI sem
isso, o build simplesmente não roda — foi o que travou ao tentar buildar
neste ambiente (sem Python, sem PlatformIO). Um container elimina essa
dependência: builda em qualquer lugar que tenha Docker, com o ambiente
sempre idêntico.

## Nível 1 — imagem oficial, sem Dockerfile próprio

Mais simples possível: usar a imagem oficial `platformio/platformio-core` e
montar a pasta do firmware como volume.

```bash
docker run --rm \
  -v "C:\Projetos\OrganizacaoOperis\development\Visao4D\firmware:/project" \
  -w /project \
  platformio/platformio-core \
  pio run
```

O `.bin` sai em `.pio/build/esp32-c6-devkitm-1/firmware.bin`, dentro da
própria pasta montada (volume bind, então o arquivo aparece direto no
filesystem local). Primeira execução baixa a toolchain do ESP32-C6 dentro do
container (fica em cache no volume do Docker entre execuções, não precisa
rebaixar toda vez).

Vantagem: zero manutenção, zero Dockerfile. Desvantagem: builda a pasta
inteira montada, então precisa do checkout do firmware local de qualquer
forma — só remove a dependência de instalar PlatformIO na máquina host.

## Nível 2 — Dockerfile com output versionado

Um Dockerfile próprio que builda e copia o binário para um nome previsível,
facilitando automatizar o upload depois.

```dockerfile
FROM platformio/platformio-core:latest

WORKDIR /project
COPY . .

RUN pio run

# Copia o .bin com nome fixo, fácil de localizar depois do build
RUN cp .pio/build/esp32-c6-devkitm-1/firmware.bin /output/firmware.bin
```

```bash
docker build -t visione-firmware-build .
docker create --name fw-extract visione-firmware-build
docker cp fw-extract:/output/firmware.bin ./firmware.bin
docker rm fw-extract
```

Isso já dá um artefato isolado, sem precisar saber o caminho interno do
PlatformIO (`.pio/build/...`) toda vez.

## Nível 3 — microsserviço HTTP que builda e publica

Fecha o ciclo: uma API recebe o pedido de build, roda o container, e chama
direto `POST /firmwares-iot` no operis (ver
[atualizacao-firmware-iot.md](atualizacao-firmware-iot.md#como-o-binário-chega-ao-coletor))
com o `.bin` resultante — sem passo manual de baixar e depois subir na tela.

Esboço do fluxo:

1. `POST /build` no microsserviço, recebendo `{ versao }` (o `modelo` é fixo
   por enquanto, `MODEL 0`) e opcionalmente o código-fonte (ou o serviço já
   tem o repo do firmware fixo e só faz `git pull` antes de buildar).
2. O serviço sobe um container efêmero (mesma ideia do Nível 1/2), roda
   `pio run`, e captura o `.bin` gerado.
3. Antes de buildar, valida que o `#define VERSION_*` em
   `visione_updater.hpp` bate com a `versao` pedida — evita subir um binário
   com o número errado gravado dentro dele (isso é uma checagem que hoje **não
   existe** em lugar nenhum, nem no fluxo manual).
4. Faz `POST /firmwares-iot` (multipart) no backend do operis com
   `modelo`, `versao` e o binário, autenticado como o usuário que disparou o
   build.
5. Devolve o `idFirmwareIot` criado, para a tela já oferecer "disparar
   atualização" na sequência.

Esse nível é o único que é de fato um "microsserviço" — os níveis 1 e 2 são
só padronização de ambiente de build, sem processo de longa duração nem API.

## Pontos em aberto (a decidir antes de implementar)

- **Onde roda o container** — dentro do mesmo host do backend `operis`, ou
  um runner de CI (GitHub Actions, por exemplo) disparado por webhook?
- **Origem do código-fonte** — o serviço sempre builda a `main` do repositório
  do firmware, ou aceita upload de um `main.cpp`/branch específico? Isso
  afeta bastante a superfície de risco (buildar código arbitrário enviado
  por alguém é diferente de buildar sempre o mesmo repo confiável).
- **Autenticação/autorização** — quem pode disparar um build? Hoje o upload
  manual (`POST /firmwares-iot`) já exige a permissão
  `dispositivos-iot:create`; o microsserviço precisaria repassar isso, não
  abrir uma porta nova sem controle.
- **Cache da toolchain** — sem cache entre builds, cada execução baixa a
  toolchain do zero (lento). Precisa de um volume persistente para o cache
  do PlatformIO (`~/.platformio` dentro do container).
