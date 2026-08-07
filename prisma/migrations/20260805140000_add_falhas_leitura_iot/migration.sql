-- CreateEnum
CREATE TYPE "MotivoFalhaLeituraIot" AS ENUM ('DISPOSITIVO_NAO_CADASTRADO', 'ENTRADA_NAO_CONFIGURADA', 'ENTRADA_DESABILITADA', 'PAYLOAD_INVALIDO');

-- CreateTable
CREATE TABLE "falhas_leitura_iot" (
    "idFalhaLeituraIot" UUID NOT NULL,
    "dispositivo_id" UUID,
    "serial" TEXT NOT NULL,
    "input" INTEGER NOT NULL,
    "motivo" "MotivoFalhaLeituraIot" NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chave_evento" TEXT NOT NULL,

    CONSTRAINT "falhas_leitura_iot_pkey" PRIMARY KEY ("idFalhaLeituraIot")
);

-- CreateIndex
CREATE UNIQUE INDEX "falhas_leitura_iot_chave_evento_key" ON "falhas_leitura_iot"("chave_evento");

-- CreateIndex
CREATE INDEX "falhas_leitura_iot_dispositivo_id_ocorrido_em_idx" ON "falhas_leitura_iot"("dispositivo_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "falhas_leitura_iot_serial_ocorrido_em_idx" ON "falhas_leitura_iot"("serial", "ocorrido_em");

-- AddForeignKey
ALTER TABLE "falhas_leitura_iot" ADD CONSTRAINT "falhas_leitura_iot_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos_iot"("idDispositivoIot") ON DELETE CASCADE ON UPDATE CASCADE;
