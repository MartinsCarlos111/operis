import type { SuperAdmin } from '../entities/super-admin.js';
import type { Email } from '../value-objects/email.js';

export interface SuperAdminRepository {
  buscarPorId(id: string): Promise<SuperAdmin | null>;
  buscarPorEmail(email: Email): Promise<SuperAdmin | null>;
  salvar(superAdmin: SuperAdmin): Promise<void>;
}
