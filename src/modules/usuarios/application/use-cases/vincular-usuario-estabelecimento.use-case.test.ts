import { describe, it, expect, beforeEach } from 'vitest';
import { VincularUsuarioEstabelecimentoUseCase } from './vincular-usuario-estabelecimento.use-case.js';
import { Usuario } from '../../domain/entities/usuario.js';
import { Email } from '../../domain/value-objects/email.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';
import type { UsuarioEstabelecimentoRepository } from '../../domain/repositories/usuario-estabelecimento.repository.js';
import type { UsuarioEstabelecimento } from '../../domain/entities/usuario-estabelecimento.js';
import type { VerificadorNivelAcesso } from '../../domain/gateways/verificador-nivel-acesso.js';
import { UsuarioNaoEncontradoError } from '../../domain/exceptions/usuario-nao-encontrado.error.js';
import { VinculoJaExisteError } from '../../domain/exceptions/vinculo-ja-existe.error.js';
import { NivelInvalidoParaEstabelecimentoError } from '../../domain/exceptions/nivel-invalido-para-estabelecimento.error.js';

class UsuarioRepositoryEmMemoria implements UsuarioRepository {
  private porId = new Map<string, Usuario>();

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.porId.get(id) ?? null;
  }

  async buscarPorEmail(email: Email): Promise<Usuario | null> {
    for (const u of this.porId.values()) {
      if (u.email.igual(email)) return u;
    }
    return null;
  }

  async salvar(usuario: Usuario): Promise<void> {
    this.porId.set(usuario.idUsuario, usuario);
  }
}

class VinculoRepositoryEmMemoria implements UsuarioEstabelecimentoRepository {
  private itens = new Map<string, UsuarioEstabelecimento>();

  private chave(usuarioId: string, estabelecimentoId: string): string {
    return `${usuarioId}|${estabelecimentoId}`;
  }

  async buscar(usuarioId: string, estabelecimentoId: string): Promise<UsuarioEstabelecimento | null> {
    return this.itens.get(this.chave(usuarioId, estabelecimentoId)) ?? null;
  }

  async listarPorUsuario(usuarioId: string): Promise<UsuarioEstabelecimento[]> {
    return [...this.itens.values()].filter((v) => v.usuarioId === usuarioId);
  }

  async salvar(vinculo: UsuarioEstabelecimento): Promise<void> {
    this.itens.set(this.chave(vinculo.usuarioId, vinculo.estabelecimentoId), vinculo);
  }
}

/** Stub da porta anticorpo: controla no teste quais níveis pertencem a quais estabelecimentos. */
class VerificadorNivelFixo implements VerificadorNivelAcesso {
  constructor(private readonly validos: Set<string>) {}

  async pertenceAoEstabelecimento(nivelAcessoId: string, estabelecimentoId: string): Promise<boolean> {
    return this.validos.has(`${nivelAcessoId}|${estabelecimentoId}`);
  }
}

const USUARIO_ID = 'usuario-1';
const ESTAB_ID = 'estab-1';
const NIVEL_ID = 'nivel-1';

describe('VincularUsuarioEstabelecimentoUseCase', () => {
  let usuarios: UsuarioRepositoryEmMemoria;
  let vinculos: VinculoRepositoryEmMemoria;
  let useCase: VincularUsuarioEstabelecimentoUseCase;

  beforeEach(async () => {
    usuarios = new UsuarioRepositoryEmMemoria();
    vinculos = new VinculoRepositoryEmMemoria();
    const verificador = new VerificadorNivelFixo(new Set([`${NIVEL_ID}|${ESTAB_ID}`]));
    useCase = new VincularUsuarioEstabelecimentoUseCase(usuarios, vinculos, verificador);

    await usuarios.salvar(
      Usuario.criar({ idUsuario: USUARIO_ID, nome: 'Ada', email: Email.criar('ada@x.com') }),
    );
  });

  it('vincula usuário a estabelecimento com nível válido', async () => {
    const dto = await useCase.executar({
      usuarioId: USUARIO_ID,
      estabelecimentoId: ESTAB_ID,
      nivelAcessoId: NIVEL_ID,
    });

    expect(dto).toMatchObject({
      usuarioId: USUARIO_ID,
      estabelecimentoId: ESTAB_ID,
      nivelAcessoId: NIVEL_ID,
      status: 'ATIVO',
    });
  });

  it('rejeita usuário inexistente', async () => {
    await expect(
      useCase.executar({ usuarioId: 'fantasma', estabelecimentoId: ESTAB_ID, nivelAcessoId: NIVEL_ID }),
    ).rejects.toBeInstanceOf(UsuarioNaoEncontradoError);
  });

  it('rejeita vínculo duplicado (um nível por estabelecimento)', async () => {
    await useCase.executar({ usuarioId: USUARIO_ID, estabelecimentoId: ESTAB_ID, nivelAcessoId: NIVEL_ID });

    await expect(
      useCase.executar({ usuarioId: USUARIO_ID, estabelecimentoId: ESTAB_ID, nivelAcessoId: NIVEL_ID }),
    ).rejects.toBeInstanceOf(VinculoJaExisteError);
  });

  it('rejeita nível que não pertence ao estabelecimento', async () => {
    await expect(
      useCase.executar({ usuarioId: USUARIO_ID, estabelecimentoId: 'outro-estab', nivelAcessoId: NIVEL_ID }),
    ).rejects.toBeInstanceOf(NivelInvalidoParaEstabelecimentoError);
  });
});
