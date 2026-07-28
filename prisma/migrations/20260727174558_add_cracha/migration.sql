-- CreateEnum
CREATE TYPE "Dedo" AS ENUM ('POLEGAR_ESQUERDO', 'INDICADOR_ESQUERDO', 'MEDIO_ESQUERDO', 'ANELAR_ESQUERDO', 'MINIMO_ESQUERDO', 'POLEGAR_DIREITO', 'INDICADOR_DIREITO', 'MEDIO_DIREITO', 'ANELAR_DIREITO', 'MINIMO_DIREITO');

-- CreateTable
CREATE TABLE "crachas" (
    "idCracha" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusRecurso" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crachas_pkey" PRIMARY KEY ("idCracha")
);

-- CreateTable
CREATE TABLE "crachas_biometrias" (
    "idCrachaBiometria" UUID NOT NULL,
    "cracha_id" UUID NOT NULL,
    "dedo" "Dedo" NOT NULL,
    "template_cifrado" TEXT NOT NULL,
    "versao_cripto" INTEGER NOT NULL DEFAULT 1,
    "formato" TEXT NOT NULL,
    "qualidade" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crachas_biometrias_pkey" PRIMARY KEY ("idCrachaBiometria")
);

-- CreateIndex
CREATE UNIQUE INDEX "crachas_codigo_key" ON "crachas"("codigo");

-- CreateIndex
CREATE INDEX "crachas_biometrias_cracha_id_idx" ON "crachas_biometrias"("cracha_id");

-- CreateIndex
CREATE UNIQUE INDEX "crachas_biometrias_cracha_id_dedo_key" ON "crachas_biometrias"("cracha_id", "dedo");

-- AddForeignKey
ALTER TABLE "crachas_biometrias" ADD CONSTRAINT "crachas_biometrias_cracha_id_fkey" FOREIGN KEY ("cracha_id") REFERENCES "crachas"("idCracha") ON DELETE CASCADE ON UPDATE CASCADE;
