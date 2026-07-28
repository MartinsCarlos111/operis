-- CreateTable
CREATE TABLE "areas_usuarios" (
    "area_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_usuarios_pkey" PRIMARY KEY ("area_id","usuario_id")
);

-- CreateIndex
CREATE INDEX "areas_usuarios_usuario_id_idx" ON "areas_usuarios"("usuario_id");

-- AddForeignKey
ALTER TABLE "areas_usuarios" ADD CONSTRAINT "areas_usuarios_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("idArea") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas_usuarios" ADD CONSTRAINT "areas_usuarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("idUsuario") ON DELETE CASCADE ON UPDATE CASCADE;
