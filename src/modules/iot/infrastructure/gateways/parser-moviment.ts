import type { MensagemIot, MovimentoRecebido } from '../../domain/gateways/consumidor-mensagens-iot.js';

/**
 * Traduz o payload MOVIMENT do firmware para o vocabulário do domínio.
 *
 * Migrado de Octopus `MovimentIOT` (Input, Context, Value, Serial, OccurredOn).
 * Aceita tanto o formato do legado (PascalCase) quanto camelCase/snake_case,
 * e tanto um objeto único quanto um array — o firmware pode agrupar leituras
 * num só envio, e o formato exato ainda não foi observado em produção.
 *
 * Mensagens que não são MOVIMENT retornam lista vazia: REGISTER/REPORT/UPDATE
 * são controle e não geram leitura.
 */
export function extrairMovimentos(mensagem: MensagemIot): MovimentoRecebido[] {
  if (mensagem.tipo !== 'MOVIMENT') return [];

  const bruto = mensagem.dados;
  const itens: unknown[] = Array.isArray(bruto) ? bruto : [bruto];

  const movimentos: MovimentoRecebido[] = [];
  for (const item of itens) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;

    const input = numero(o.input ?? o.Input);
    const valor = numero(o.value ?? o.Value ?? o.valor);
    const contexto = numero(o.context ?? o.Context ?? o.contexto);
    if (input === null) continue;

    movimentos.push({
      serial: texto(o.serial ?? o.Serial) ?? mensagem.serial,
      input,
      contexto: contexto ?? 0,
      // Pulso de contador costuma vir sem valor: cada evento conta 1.
      valor: valor ?? 1,
      ocorridoEm: data(o.occurredOn ?? o.OccurredOn ?? o.timestamp ?? o.ocorridoEm),
    });
  }
  return movimentos;
}

function numero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/**
 * Sem instante no payload, usa a hora de recepção. Um dado com timestamp
 * aproximado vale mais que um dado descartado — mas é o motivo de
 * `registradoEm` existir separado de `ocorridoEm`.
 */
function data(v: unknown): Date {
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
