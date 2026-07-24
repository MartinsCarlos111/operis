import { describe, it, expect, beforeEach } from 'vitest';
import { CriarTenantUseCase, type CriarTenantInput } from './criar-tenant.use-case.js';
import type { Tenant } from '../../domain/entities/tenant.js';
import type { TenantAdministrador } from '../../domain/entities/tenant-administrador.js';
import type { Slug } from '../../domain/value-objects/slug.js';
import type { Email } from '../../domain/value-objects/email.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import type { TenantAdministradorRepository } from '../../domain/repositories/tenant-administrador.repository.js';
import type { EncryptionService, SegredoCifrado } from '../../domain/gateways/encryption-service.js';
import type { HasherSenha } from '../../domain/gateways/hasher-senha.js';
import type { DadosConexaoBanco, ValidadorConexaoBanco } from '../../domain/gateways/validador-conexao-banco.js';
import type { ProvisionadorSchemaTenant } from '../../domain/gateways/provisionador-schema-tenant.js';
import type { GeradorId } from '@shared/domain/gerador-id.js';
import { SlugJaExisteError, ConexaoBancoFalhouError } from '../../domain/exceptions/index.js';

class TenantRepositoryEmMemoria implements TenantRepository {
  itens = new Map<string, Tenant>();

  async buscarPorId(id: string): Promise<Tenant | null> {
    return this.itens.get(id) ?? null;
  }

  async buscarPorSlug(slug: Slug): Promise<Tenant | null> {
    for (const t of this.itens.values()) {
      if (t.slug.igual(slug)) return t;
    }
    return null;
  }

  async listar(): Promise<Tenant[]> {
    return [...this.itens.values()];
  }

  async salvar(tenant: Tenant): Promise<void> {
    this.itens.set(tenant.idTenant, tenant);
  }
}

class AdministradorRepositoryEmMemoria implements TenantAdministradorRepository {
  itens = new Map<string, TenantAdministrador>();

  async buscarPorEmail(email: Email): Promise<TenantAdministrador | null> {
    for (const a of this.itens.values()) {
      if (a.email.igual(email)) return a;
    }
    return null;
  }

  async listarPorTenant(tenantId: string): Promise<TenantAdministrador[]> {
    return [...this.itens.values()].filter((a) => a.tenantId === tenantId);
  }

  async salvar(administrador: TenantAdministrador): Promise<void> {
    this.itens.set(administrador.idTenantAdministrador, administrador);
  }
}

/** Cifragem falsa reversível — o teste só verifica que texto puro não persiste. */
class EncryptionFake implements EncryptionService {
  cifrar(textoPuro: string): SegredoCifrado {
    return { valor: `cifrado(${Buffer.from(textoPuro).toString('base64')})`, versao: 1 };
  }
  decifrar(cifrado: SegredoCifrado): string {
    return Buffer.from(cifrado.valor.slice(8, -1), 'base64').toString('utf8');
  }
}

class HasherFake implements HasherSenha {
  async gerarHash(senha: string): Promise<string> {
    return `hash(${senha})`;
  }
  async verificar(senha: string, hash: string): Promise<boolean> {
    return hash === `hash(${senha})`;
  }
}

class ValidadorConexaoStub implements ValidadorConexaoBanco {
  falhar = false;
  chamadas: DadosConexaoBanco[] = [];

  async validar(dados: DadosConexaoBanco): Promise<void> {
    this.chamadas.push(dados);
    if (this.falhar) throw new ConexaoBancoFalhouError('host inacessível');
  }
}

class ProvisionadorStub implements ProvisionadorSchemaTenant {
  provisionados: string[] = [];

  async provisionar(dados: DadosConexaoBanco): Promise<void> {
    this.provisionados.push(dados.nomeBanco);
  }
}

class GeradorIdSequencial implements GeradorId {
  private n = 0;
  gerar(): string {
    return `id-${++this.n}`;
  }
}

const INPUT_VALIDO: CriarTenantInput = {
  nome: 'ACME Ltda',
  slug: 'acme',
  banco: {
    host: 'db.acme.interno',
    porta: 5432,
    nomeBanco: 'operis_acme',
    usuario: 'operis_app',
    senha: 'senha-super-secreta',
  },
  administrador: {
    nome: 'Alice Admin',
    email: 'alice@acme.com',
    senha: 'senha-alice-123',
  },
};

describe('CriarTenantUseCase', () => {
  let tenants: TenantRepositoryEmMemoria;
  let administradores: AdministradorRepositoryEmMemoria;
  let validador: ValidadorConexaoStub;
  let provisionador: ProvisionadorStub;
  let useCase: CriarTenantUseCase;

  beforeEach(() => {
    tenants = new TenantRepositoryEmMemoria();
    administradores = new AdministradorRepositoryEmMemoria();
    validador = new ValidadorConexaoStub();
    provisionador = new ProvisionadorStub();
    useCase = new CriarTenantUseCase(
      tenants,
      administradores,
      new EncryptionFake(),
      new HasherFake(),
      validador,
      provisionador,
      new GeradorIdSequencial(),
    );
  });

  it('provisiona o tenant completo: valida conexão, cifra senha, salva, aplica schema, cria admin', async () => {
    const resultado = await useCase.executar(INPUT_VALIDO);

    expect(resultado.tenant).toMatchObject({
      nome: 'ACME Ltda',
      slug: 'acme',
      status: 'ATIVO',
      banco: { host: 'db.acme.interno', statusConexao: 'ONLINE' },
    });
    expect(resultado.administrador).toMatchObject({
      email: 'alice@acme.com',
      tenantId: resultado.tenant.idTenant,
    });

    // Conexão validada ANTES de persistir; schema aplicado no banco do tenant.
    expect(validador.chamadas).toHaveLength(1);
    expect(provisionador.provisionados).toEqual(['operis_acme']);

    // A senha do banco não existe em texto puro no agregado persistido.
    const salvo = await tenants.buscarPorId(resultado.tenant.idTenant);
    expect(salvo!.banco!.senhaCifrada.valor).not.toContain('senha-super-secreta');
  });

  it('a senha nunca aparece no DTO devolvido ao painel', async () => {
    const resultado = await useCase.executar(INPUT_VALIDO);
    expect(JSON.stringify(resultado)).not.toContain('senha-super-secreta');
    expect(JSON.stringify(resultado)).not.toContain('senha-alice-123');
  });

  it('rejeita slug duplicado', async () => {
    await useCase.executar(INPUT_VALIDO);

    await expect(
      useCase.executar({
        ...INPUT_VALIDO,
        administrador: { ...INPUT_VALIDO.administrador, email: 'outro@acme.com' },
      }),
    ).rejects.toBeInstanceOf(SlugJaExisteError);
  });

  it('não persiste NADA se a validação de conexão falhar', async () => {
    validador.falhar = true;

    await expect(useCase.executar(INPUT_VALIDO)).rejects.toBeInstanceOf(ConexaoBancoFalhouError);

    expect(tenants.itens.size).toBe(0);
    expect(administradores.itens.size).toBe(0);
    expect(provisionador.provisionados).toHaveLength(0);
  });
});
