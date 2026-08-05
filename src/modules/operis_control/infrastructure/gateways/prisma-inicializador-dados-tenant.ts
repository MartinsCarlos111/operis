import { PrismaClient } from '@prisma/client';
import { CATALOGO_PERMISSOES_PADRAO } from '@shared/rbac/catalogo-permissoes.js';
import type {
  AdministradorInicialTenant,
  InicializadorDadosTenant,
} from '../../domain/gateways/inicializador-dados-tenant.js';
import type { DadosConexaoBanco } from '../../domain/gateways/validador-conexao-banco.js';
import { montarUrlPostgres } from './url-conexao.js';

/**
 * Inicializa dados minimos do Data Plane. O id do Usuario e propositalmente o
 * mesmo do TenantAdministrador, pois ele sera o `sub` do JWT autenticado.
 */
export class PrismaInicializadorDadosTenant implements InicializadorDadosTenant {
  async inicializar(dados: DadosConexaoBanco, administrador: AdministradorInicialTenant): Promise<void> {
    const prisma = new PrismaClient({
      datasources: { db: { url: montarUrlPostgres(dados) } },
    });

    try {
      await prisma.$transaction(async (tx) => {
        for (const permissao of CATALOGO_PERMISSOES_PADRAO) {
          await tx.permissao.upsert({
            where: { chave: permissao.chave },
            create: permissao,
            update: { grupo: permissao.grupo, descricao: permissao.descricao },
          });
        }

        await tx.usuario.upsert({
          where: { idUsuario: administrador.idUsuario },
          create: {
            idUsuario: administrador.idUsuario,
            nome: administrador.nome,
            email: administrador.email,
          },
          update: { nome: administrador.nome, email: administrador.email, status: 'ATIVO' },
        });
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}
