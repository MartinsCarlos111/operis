CREATE TABLE "configuracoes_campos" (
    "idConfiguracaoCampo" UUID NOT NULL,
    "estabelecimento_id" UUID NOT NULL,
    "tela" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuracoes_campos_pkey" PRIMARY KEY ("idConfiguracaoCampo")
);
CREATE UNIQUE INDEX "configuracoes_campos_estabelecimento_id_tela_campo_key" ON "configuracoes_campos"("estabelecimento_id", "tela", "campo");
CREATE INDEX "configuracoes_campos_estabelecimento_id_tela_idx" ON "configuracoes_campos"("estabelecimento_id", "tela");
ALTER TABLE "configuracoes_campos" ADD CONSTRAINT "configuracoes_campos_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("idEstabelecimento") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissoes" ("idPermissao", "chave", "grupo", "descricao")
SELECT gen_random_uuid(), chave, 'manufatura:artigos-ciclos', descricao
FROM (VALUES
  ('manufatura:artigos-ciclos:acesso', 'Artigos e ciclos - acesso'),
  ('manufatura:artigos-ciclos:adicionar', 'Artigos e ciclos - adicionar'),
  ('manufatura:artigos-ciclos:editar', 'Artigos e ciclos - editar'),
  ('manufatura:artigos-ciclos:excluir', 'Artigos e ciclos - excluir'),
  ('manufatura:artigos-ciclos:importar', 'Artigos e ciclos - importar'),
  ('manufatura:artigos-ciclos:exportar', 'Artigos e ciclos - exportar'),
  ('manufatura:artigos-ciclos:configuracao-campos', 'Artigos e ciclos - configuração de campos')
) AS novas(chave, descricao)
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" p WHERE p."chave" = novas.chave);

INSERT INTO "niveis_acesso_permissoes" ("nivel_acesso_id", "permissao_id")
SELECT n."idNivelAcesso", p."idPermissao"
FROM "niveis_acesso" n CROSS JOIN "permissoes" p
WHERE n."nome" = 'Administrador' AND p."grupo" = 'manufatura:artigos-ciclos'
ON CONFLICT DO NOTHING;
