-- `tipo` agora é o modo elétrico do sensor (PNP/NPN), não mais um
-- diferenciador de porta — cada porta física (1-5) tem no máximo uma
-- configuração por dispositivo.
DROP INDEX "entradas_iot_dispositivo_id_input_tipo_key";

CREATE UNIQUE INDEX "entradas_iot_dispositivo_id_input_key" ON "entradas_iot"("dispositivo_id", "input");
