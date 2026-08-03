-- CreateEnum
CREATE TYPE "TipoEntradaIot" AS ENUM ('DIGITAL', 'ANALOGICA');

-- CreateEnum
CREATE TYPE "ContextoIot" AS ENUM ('PRODUCAO', 'PARADA', 'QUALIDADE', 'MANUTENCAO');

-- CreateEnum
CREATE TYPE "FuncaoIot" AS ENUM ('CONTADOR', 'STATUS', 'SINAL', 'TEMPERATURA', 'PRESSAO');

-- CreateTable
CREATE TABLE "dispositivos_iot" (
    "idDispositivoIot" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "modelo" INTEGER NOT NULL DEFAULT 0,
    "versao_firmware" TEXT,
    "ip" TEXT,
    "centro_trabalho" TEXT,
    "estabelecimento_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivos_iot_pkey" PRIMARY KEY ("idDispositivoIot")
);

-- CreateTable
CREATE TABLE "entradas_iot" (
    "idEntradaIot" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "input" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "tipo" "TipoEntradaIot" NOT NULL,
    "contexto" "ContextoIot" NOT NULL,
    "funcao" "FuncaoIot" NOT NULL,
    "param1" DECIMAL(18,4),
    "param2" DECIMAL(18,4),
    "param3" DECIMAL(18,4),
    "param4" DECIMAL(18,4),
    "analogica_como_digital" BOOLEAN NOT NULL DEFAULT false,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entradas_iot_pkey" PRIMARY KEY ("idEntradaIot")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_iot_serial_key" ON "dispositivos_iot"("serial");

-- CreateIndex
CREATE INDEX "dispositivos_iot_estabelecimento_id_idx" ON "dispositivos_iot"("estabelecimento_id");

-- CreateIndex
CREATE INDEX "entradas_iot_dispositivo_id_idx" ON "entradas_iot"("dispositivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "entradas_iot_dispositivo_id_input_tipo_key" ON "entradas_iot"("dispositivo_id", "input", "tipo");

-- AddForeignKey
ALTER TABLE "dispositivos_iot" ADD CONSTRAINT "dispositivos_iot_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_iot" ADD CONSTRAINT "entradas_iot_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos_iot"("idDispositivoIot") ON DELETE CASCADE ON UPDATE CASCADE;
