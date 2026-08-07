import amqp from 'amqplib';
import type { EntradaIot } from '../../domain/entities/entrada-iot.js';
import { CONTEXTOS_IOT, FUNCOES_IOT, TIPOS_ENTRADA_IOT } from '../../domain/entities/entrada-iot.js';
import type { PublicadorConfiguracaoIot } from '../../domain/gateways/publicador-configuracao-iot.js';
import type { ResolvedorAcessoBroker } from './rabbitmq-consultor-conexoes.js';

/** Mesma ordem do enum do domínio — índice = valor esperado pelo firmware. */
const INDICE_POR_TIPO = new Map(TIPOS_ENTRADA_IOT.map((t, i) => [t, i + 1]));
const INDICE_POR_CONTEXTO = new Map(CONTEXTOS_IOT.map((c, i) => [c, i + 1]));
const INDICE_POR_FUNCAO = new Map(FUNCOES_IOT.map((f, i) => [f, i + 1]));

/**
 * Publica a configuração de entradas de volta ao coletor via RabbitMQ.
 *
 * Paridade com `ConfigIOTController.SaveConfigIOT`: abre uma conexão AMQP
 * curta, publica `{type: CONFIGURATION, data: {input_1: {...}, ...}}` na
 * `amq.topic` com a routing key do dispositivo (`devices.<modelo>.<serial>`)
 * e fecha. Não há conexão de longa duração aqui — publicar é raro (só quando
 * a configuração muda), diferente do consumo contínuo do worker.
 */
export class AmqpPublicadorConfiguracaoIot implements PublicadorConfiguracaoIot {
  constructor(
    private readonly resolverAcesso: ResolvedorAcessoBroker,
    private readonly log: (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void = () => {},
  ) {}

  async publicarConfiguracao(
    tenantId: string,
    routingKey: string,
    entradas: readonly EntradaIot[],
  ): Promise<void> {
    const acesso = await this.resolverAcesso(tenantId).catch(() => null);
    if (!acesso) {
      this.log('erro', `publicação de configuração ignorada: broker não configurado (${routingKey})`);
      return;
    }

    // Paridade com ConfigIOTController.SaveConfigIOT: a chave é sempre
    // "input_{N}" com o número real da porta (input_5 é a analógica) — o
    // firmware nunca conhece "input_analog". Só entram as portas que a tela
    // enviou; o legado também não força as 5 portas em todo payload.
    const data: Record<string, unknown> = {};
    for (const entrada of entradas) {
      data[`input_${entrada.input}`] = {
        enabled: entrada.habilitado,
        type: INDICE_POR_TIPO.get(entrada.tipo) ?? 0,
        context: INDICE_POR_CONTEXTO.get(entrada.contexto) ?? 0,
        function: INDICE_POR_FUNCAO.get(entrada.funcao) ?? 0,
        param_1: entrada.param1 ?? 0,
        param_2: entrada.param2 ?? 0,
        param_3: entrada.param3 ?? 0,
        param_4: entrada.param4 ?? 0,
        mode: entrada.analogicaComoDigital ? 1 : 0,
      };
    }

    const payload = JSON.stringify({ type: 'CONFIGURATION', data });
    const uri = this.montarUri(acesso);

    let conexao: Awaited<ReturnType<typeof amqp.connect>> | null = null;
    try {
      conexao = await amqp.connect(uri);
      const canal = await conexao.createChannel();
      canal.publish('amq.topic', routingKey, Buffer.from(payload, 'utf8'));
      await canal.close();
      this.log('info', `configuração publicada para ${routingKey}`);
    } catch (erro) {
      // Best-effort: o coletor físico pode estar offline — a config já está
      // salva no banco e será reenviada na próxima edição.
      this.log('erro', `falha ao publicar configuração para ${routingKey}`, erro);
    } finally {
      try {
        await conexao?.close();
      } catch {
        // conexão já fechada — nada a fazer
      }
    }
  }

  private montarUri(acesso: { host: string; porta: number; usuario: string; senha: string; virtualHost: string; sslHabilitado: boolean }): string {
    const protocolo = acesso.sslHabilitado ? 'amqps' : 'amqp';
    const usuario = encodeURIComponent(acesso.usuario);
    const senha = encodeURIComponent(acesso.senha);
    const vhost = encodeURIComponent(acesso.virtualHost);
    return `${protocolo}://${usuario}:${senha}@${acesso.host}:${acesso.porta}/${vhost}`;
  }
}
