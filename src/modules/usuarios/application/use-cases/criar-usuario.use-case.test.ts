import { describe, it, expect, beforeEach } from 'vitest';
import { CriarUsuarioUseCase } from './criar-usuario.use-case.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import type { Usuario } from '../../domain/entities/usuario.js';
import type { Email } from '../../domain/value-objects/email.js';
import { EmailJaEmUsoError } from '../../domain/exceptions/email-ja-em-uso.error.js';
import { EmailInvalidoError } from '../../domain/exceptions/email-invalido.error.js';

/**
 * Sem Prisma, sem Fastify, sem banco: o caso de uso depende de portas, então
 * um fake em memória basta. É o payoff concreto da inversão de dependência.
 */
class UsuarioRepositoryEmMemoria implements UsuarioRepository {
  private porId = new Map<string, Usuario>();

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.porId.get(id) ?? null;
  }

  async buscarPorEmail(email: Email): Promise<Usuario | null> {
    for (const usuario of this.porId.values()) {
      if (usuario.email.igual(email)) return usuario;
    }
    return null;
  }

  async salvar(usuario: Usuario): Promise<void> {
    this.porId.set(usuario.idUsuario, usuario);
  }
}

class GeradorIdFixo implements GeradorId {
  constructor(private readonly id: string) {}
  gerar(): string {
    return this.id;
  }
}

describe('CriarUsuarioUseCase', () => {
  let repo: UsuarioRepositoryEmMemoria;
  let useCase: CriarUsuarioUseCase;

  beforeEach(() => {
    repo = new UsuarioRepositoryEmMemoria();
    useCase = new CriarUsuarioUseCase(repo, new GeradorIdFixo('id-fixo-1'));
  });

  it('cria um usuário e devolve o DTO com email normalizado', async () => {
    const dto = await useCase.executar({ nome: 'Ada', email: 'Ada@Exemplo.com.br' });

    expect(dto).toMatchObject({
      idUsuario: 'id-fixo-1',
      email: 'ada@exemplo.com.br', // normalizado pelo VO Email
      nome: 'Ada',
      status: 'ATIVO',
      biometria: false,
    });
  });

  it('rejeita email duplicado', async () => {
    await useCase.executar({ nome: 'Ada', email: 'ada@exemplo.com.br' });

    await expect(
      useCase.executar({ nome: 'Ada Lovelace', email: 'ADA@exemplo.com.br' }),
    ).rejects.toBeInstanceOf(EmailJaEmUsoError);
  });

  it('rejeita email inválido antes de tocar o repositório', async () => {
    await expect(
      useCase.executar({ nome: 'Ada', email: 'nao-e-email' }),
    ).rejects.toBeInstanceOf(EmailInvalidoError);

    expect(await repo.buscarPorId('id-fixo-1')).toBeNull();
  });
});
