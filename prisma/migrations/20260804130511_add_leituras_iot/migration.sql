-- CreateTable
CREATE TABLE "leituras_iot" (
    "idLeituraIot" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "input" INTEGER NOT NULL,
    "contexto" "ContextoIot" NOT NULL,
    "valor" DECIMAL(18,4) NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chave_evento" TEXT NOT NULL,

    CONSTRAINT "leituras_iot_pkey" PRIMARY KEY ("idLeituraIot")
);

-- CreateIndex
CREATE UNIQUE INDEX "leituras_iot_chave_evento_key" ON "leituras_iot"("chave_evento");

-- CreateIndex
CREATE INDEX "leituras_iot_dispositivo_id_ocorrido_em_idx" ON "leituras_iot"("dispositivo_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "leituras_iot_dispositivo_id_input_ocorrido_em_idx" ON "leituras_iot"("dispositivo_id", "input", "ocorrido_em");

-- AddForeignKey
ALTER TABLE "leituras_iot" ADD CONSTRAINT "leituras_iot_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos_iot"("idDispositivoIot") ON DELETE CASCADE ON UPDATE CASCADE;
