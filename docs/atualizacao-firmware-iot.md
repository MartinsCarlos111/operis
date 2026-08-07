# Atualização de firmware dos coletores IoT

Este documento descreve de ponta a ponta o fluxo de atualização OTA
(over-the-air) dos coletores IoT: onde fica o código-fonte do firmware, como
gerar o binário, como ele é publicado no operis, e como o coletor físico o
recebe e aplica. Serve tanto para quem mexe na tela **Manufatura →
Configurações → Atualização de Firmware** quanto para quem mexe no firmware
em si.

## Onde está cada coisa

O repositório de hardware (`Hardware_distrato`) contém **só o projeto
elétrico/mecânico** dos coletores — esquemático KiCad, Gerber, BOM, STEP/STL
de mecânica, datasheets. Não tem nada buildável em firmware ali; é fácil
confundir por causa do nome parecido dos modelos.

O código-fonte do firmware (o que de fato roda no coletor) fica em outro
lugar:

```
C:\Projetos\OrganizacaoOperis\development\Visao4D\firmware\
├── platformio.ini              # ambiente esp32-c6-devkitm-1, framework Arduino
├── partitions\app3M_spiffs4.5M.csv
└── src\
    ├── main.cpp
    ├── visione_updater.hpp     # download + gravação OTA
    ├── visione_mqtt.hpp        # recebe o comando UPDATE do broker
    ├── visione_wifi.hpp
    ├── visione_ethernet.hpp
    ├── visione_ble.hpp
    ├── visione_i2c.hpp
    ├── visione_input.hpp
    ├── visione_leds.hpp
    ├── visione_offline_store.hpp
    └── visione_timer.hpp
```

É um projeto **PlatformIO** (não Arduino IDE puro), alvo `esp32-c6-devkitm-1`,
com três libs externas (`FastLED`, `ArduinoJson`, `MQTTPubSubClient`).

## Como gerar o `.bin`

Pré-requisito: [PlatformIO](https://platformio.org/) instalado (CLI ou a
extensão do VS Code — o projeto já tem `.vscode/extensions.json` apontando
para ela). PlatformIO Core roda sobre Python. Para não depender disso na
máquina local, ver a proposta de build containerizado em
[build-firmware-containerizado.md](build-firmware-containerizado.md).

Via CLI, a partir da pasta `firmware`:

```
pio run
```

O binário sai em `.pio/build/esp32-c6-devkitm-1/firmware.bin`. Esse é o
arquivo que vai no campo "Arquivo" do upload na tela de Atualização de
Firmware — o backend não faz nenhum processamento nele, só armazena e
repassa os bytes como vieram.

A versão e o modelo que vão no upload **precisam bater** com o que está
hardcoded no firmware, em `visione_updater.hpp`:

```cpp
#define VERSION_MAJOR 1
#define VERSION_MINOR 1
#define VERSION_PATCH 7
#define MODEL 0
```

(`1.1.x` é convenção de produção nesse arquivo; `1.2.x` de teste — comentário
dos próprios autores do firmware, não é validado em código.) O `MODEL 0`
corresponde ao campo `modelo` das telas e rotas — hoje só existe o modelo 0.
Se um novo hardware for lançado, esse é o número que muda tanto no firmware
quanto no cadastro do binário.

## Como o binário chega ao coletor

O fluxo completo, do upload até o coletor rodando a nova versão:

1. **Upload** — `POST /firmwares-iot` (multipart: `modelo`, `versao`,
   `arquivo`) grava o binário no MinIO/S3 do tenant e cria um registro
   `FirmwareIot` (modelo, versão, tamanho, data). Rota:
   [firmware-iot.routes.ts](../src/modules/iot/infrastructure/http/firmware-iot.routes.ts).

2. **Disparo** — `POST /dispositivos-iot/:id/atualizar-firmware` com
   `{ firmwareId }` cria um `AtualizacaoFirmwareIot` (status `SOLICITADA`) e
   publica no broker RabbitMQ, no tópico do dispositivo, uma mensagem:
   ```json
   { "type": "UPDATE", "data": { "firmware_url": "https://.../firmware/download/<tenantId>/<firmwareId>" } }
   ```

3. **Coletor recebe via MQTT** — em `visione_mqtt.hpp`, o `case UPDATE:`
   marca `update_in_progress = true`, publica `UPDATESTARTED`, e monta a URL
   final como:
   ```cpp
   firmware_url + "?serialIot=" + device_id
   ```
   O `serialIot` na query string é só para identificação/log no legado — o
   backend já resolve tenant e firmware pelos segmentos `:tenantId/:firmwareId`
   da própria URL (rota pública, sem autenticação, porque o coletor não tem
   credenciais).

4. **Download público** — `GET /firmware/download/:tenantId/:firmwareId`
   resolve a conexão do tenant a partir do `tenantId` na URL (via
   `ConnectionManager`, já que não há `request.prismaTenant` numa rota sem
   auth) e devolve o binário como `application/octet-stream`.

5. **Gravação OTA** — em `visione_updater.hpp`, `update_firmware()` baixa via
   `HTTPClient` (HTTP ou HTTPS, com `setInsecure()` se for HTTPS — sem
   validação de certificado) e `perform_update()` grava o conteúdo direto na
   partição OTA usando a API nativa `Update` do ESP32. Timeout de 60s
   (`UPDATE_TIMEOUT_MS`). Ao final, publica `UPDATECOMPLETED` ou
   `UPDATEFAILED` de volta pelo MQTT.

6. **Histórico** — o backend consulta
   `GET /dispositivos-iot/:id/atualizacoes-firmware` para listar os ciclos e
   seus status (`SOLICITADA` → `INICIADA` → `CONCLUIDA`/`FALHOU`), exibido na
   tela como histórico por dispositivo.

## Tela (Manufatura → Configurações → Atualização de Firmware)

A tela lista os dispositivos conectados (nome, serial, modelo, versão atual
de firmware, online/offline). Duas ações:

- **Enviar firmware** (botão no topo): upload de um novo binário para um
  modelo — abre modal com campos modelo/versão/arquivo.
- **Clicar num dispositivo**: abre modal com (a) seletor das versões já
  enviadas para o modelo daquele dispositivo, indicando a mais recente, com
  botão para disparar a atualização; (b) histórico de atualizações daquele
  dispositivo com status.

Componente:
[AtualizacaoFirmwareView.tsx](../../operis-front/src/components/iot/AtualizacaoFirmwareView.tsx)
no `operis-front`.

## Pontos de atenção

- **Sem rollback automático.** Se o binário enviado for inválido para o
  hardware (modelo errado, build corrompida), o coletor pode ficar em boot
  loop — não há verificação de compatibilidade além do campo `modelo`
  informado manualmente no upload.
- **HTTPS sem validação de certificado** (`setInsecure()`) — o coletor não
  valida a cadeia TLS do download. Não é um problema novo introduzido por
  este fluxo, é assim que o firmware já se comporta hoje.
- **`firmwareId` é global, não por tenant** — a rota pública de download
  relaxa a busca para não exigir `estabelecimentoId` (que o coletor não tem
  como informar), então o UUID do firmware sozinho já é a chave de busca.
