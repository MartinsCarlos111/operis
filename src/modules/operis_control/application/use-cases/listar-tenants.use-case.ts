import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import { paraTenantDTO, type TenantDTO } from '../dtos/tenant.dto.js';

export class ListarTenantsUseCase {
  constructor(private readonly tenants: TenantRepository) {}

  async executar(): Promise<TenantDTO[]> {
    const todos = await this.tenants.listar();
    return todos.map(paraTenantDTO);
  }
}
