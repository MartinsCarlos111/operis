-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- CreateTable
CREATE TABLE "turnos" (
    "idTurno" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "calendario_id" UUID NOT NULL,
    "inicio_minutos" INTEGER NOT NULL,
    "fim_minutos" INTEGER NOT NULL,
    "tempo_total_minutos" INTEGER NOT NULL,
    "tempo_disponivel_minutos" INTEGER NOT NULL,
    "dias_semana" "DiaSemana"[],
    "util" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("idTurno")
);

-- CreateIndex
CREATE INDEX "turnos_calendario_id_idx" ON "turnos"("calendario_id");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_calendario_id_codigo_key" ON "turnos"("calendario_id", "codigo");

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_calendario_id_fkey" FOREIGN KEY ("calendario_id") REFERENCES "calendarios"("idCalendario") ON DELETE CASCADE ON UPDATE CASCADE;

