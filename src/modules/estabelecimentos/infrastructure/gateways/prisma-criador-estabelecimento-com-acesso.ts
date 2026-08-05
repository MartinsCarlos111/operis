import { PrismaClient } from '@prisma/client';
import { CATALOGO_PERMISSOES_PADRAO } from '@shared/rbac/catalogo-permissoes.js';
import type { Estabelecimento } from '../../domain/entities/estabelecimento.js';
import type { CriadorEstabelecimentoComAcesso } from '../../domain/gateways/criador-estabelecimento-com-acesso.js';
import { EstabelecimentoMapper } from '../persistence/estabelecimento.mapper.js';

/**
 * Um estabelecimento novo nasce com um administrador. Isso evita que a rota
 * de criacao deixe o tenant sem nivel de acesso ou vinculo para o criador.
 */
export class PrismaCriadorEstabelecimentoComAcesso implements CriadorEstabelecimentoComAcesso {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(estabelecimento: Estabelecimento, usuarioId: string): Promise<void> {
    const data = EstabelecimentoMapper.paraPersistencia(estabelecimento);

    await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { idUsuario: usuarioId } });
      if (!usuario) {
        throw new Error('Administrador autenticado nao existe no banco do tenant');
      }

      await tx.estabelecimento.upsert({
        where: { idEstabelecimento: data.idEstabelecimento },
        create: data,
        update: {
          descricao: data.descricao,
          status: data.status,
          impressoras: data.impressoras,
          coletores: data.coletores,
          checklist: data.checklist,
          manufatura: data.manufatura,
          atualizadoEm: data.atualizadoEm,
        },
      });

      for (const permissao of CATALOGO_PERMISSOES_PADRAO) {
        await tx.permissao.upsert({
          where: { chave: permissao.chave },
          create: permissao,
          update: { grupo: permissao.grupo, descricao: permissao.descricao },
        });
      }

      const permissoes = await tx.permissao.findMany({ select: { idPermissao: true } });
      const administrador = await tx.nivelAcesso.upsert({
        where: {
          estabelecimentoId_nome: {
            estabelecimentoId: estabelecimento.idEstabelecimento,
            nome: 'Administrador',
          },
        },
        create: {
          nome: 'Administrador',
          descricao: 'Acesso total ao estabelecimento',
          estabelecimentoId: estabelecimento.idEstabelecimento,
        },
        update: { descricao: 'Acesso total ao estabelecimento', status: 'ATIVO' },
      });

      await tx.nivelAcessoPermissao.deleteMany({
        where: { nivelAcessoId: administrador.idNivelAcesso },
      });
      await tx.nivelAcessoPermissao.createMany({
        data: permissoes.map((permissao) => ({
          nivelAcessoId: administrador.idNivelAcesso,
          permissaoId: permissao.idPermissao,
        })),
      });

      await tx.usuarioEstabelecimento.upsert({
        where: {
          usuarioId_estabelecimentoId: {
            usuarioId,
            estabelecimentoId: estabelecimento.idEstabelecimento,
          },
        },
        create: {
          usuarioId,
          estabelecimentoId: estabelecimento.idEstabelecimento,
          nivelAcessoId: administrador.idNivelAcesso,
        },
        update: { nivelAcessoId: administrador.idNivelAcesso, status: 'ATIVO' },
      });
    });
  }
}
