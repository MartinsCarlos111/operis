import type { DispositivoIotRepository } from '../../domain/repositories/dispositivo-iot.repository.js';
import { DispositivoIotNaoEncontradoError } from '../../domain/exceptions/index.js';

/** Exclui um coletor. As entradas caem junto (cascade no schema). */
export class ExcluirDispositivoIotUseCase {
  constructor(private readonly dispositivos: DispositivoIotRepository) {}

  async executar(id: string, estabelecimentoId: string): Promise<void> {
    const dispositivo = await this.dispositivos.buscarPorId(id, estabelecimentoId);
    if (!dispositivo) {
      throw new DispositivoIotNaoEncontradoError(id);
    }
    await this.dispositivos.excluir(id);
  }
}
