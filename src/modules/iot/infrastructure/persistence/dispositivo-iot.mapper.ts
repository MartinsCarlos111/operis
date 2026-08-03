import type {
  DispositivoIot as DispositivoIotRow,
  EntradaIot as EntradaIotRow,
} from '@prisma/client';
import { DispositivoIot } from '../../domain/entities/dispositivo-iot.js';
import { EntradaIot } from '../../domain/entities/entrada-iot.js';

type LinhaComEntradas = DispositivoIotRow & { entradas?: EntradaIotRow[] };

/**
 * Traduz entre as linhas do Prisma e o agregado. Os `param1..4` são Decimal no
 * banco (precisão do legado) e number no domínio — a conversão acontece aqui,
 * para o domínio não conhecer tipos do Prisma.
 */
export const DispositivoIotMapper = {
  paraDominio(row: LinhaComEntradas): DispositivoIot {
    const dispositivo = DispositivoIot.restaurar({
      idDispositivoIot: row.idDispositivoIot,
      serial: row.serial,
      nome: row.nome,
      modelo: row.modelo,
      versaoFirmware: row.versaoFirmware,
      ip: row.ip,
      centroTrabalho: row.centroTrabalho,
      estabelecimentoId: row.estabelecimentoId,
      entradas: (row.entradas ?? []).map((e) =>
        EntradaIot.restaurar({
          idEntradaIot: e.idEntradaIot,
          dispositivoId: e.dispositivoId,
          input: e.input,
          label: e.label,
          tipo: e.tipo,
          contexto: e.contexto,
          funcao: e.funcao,
          param1: e.param1 === null ? null : Number(e.param1),
          param2: e.param2 === null ? null : Number(e.param2),
          param3: e.param3 === null ? null : Number(e.param3),
          param4: e.param4 === null ? null : Number(e.param4),
          analogicaComoDigital: e.analogicaComoDigital,
          habilitado: e.habilitado,
        }),
      ),
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
    return dispositivo;
  },
};
