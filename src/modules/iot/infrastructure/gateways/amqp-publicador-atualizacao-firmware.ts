import amqp from 'amqplib';
import type { PublicadorAtualizacaoFirmwareIot } from '../../domain/gateways/publicador-atualizacao-firmware-iot.js';
import type { ResolvedorAcessoBroker } from './rabbitmq-consultor-conexoes.js';

/**
 * Publica o disparo de OTA de volta ao coletor via RabbitMQ. Mesma forma de
 * `AmqpPublicadorConfiguracaoIot`: conexão AMQP curta, publica na `amq.topic`
 * com a routing key do dispositivo, fecha em seguida.
 */
export class AmqpPublicadorAtualizacaoFirmwareIot implements PublicadorAtualizacaoFirmwareIot {
  constructor(
    private readonly resolverAcesso: ResolvedorAcessoBroker,
    private readonly log: (nivel: 'info' | 'erro', msg: string, extra?: unknown) => void = () => {},
  ) {}

  async publicarAtualizacao(
    tenantId: string,
    routingKey: string,
    firmwareUrl: string,
  ): Promise<void> {
    const acesso = await this.resolverAcesso(tenantId).catch(() => null);
    if (!acesso) {
      this.log('erro', `publicação de atualização ignorada: broker não configurado (${routingKey})`);
      return;
    }

    const payload = JSON.stringify({ type: 'UPDATE', data: { firmware_url: firmwareUrl } });
    const uri = this.montarUri(acesso);

    let conexao: Awaited<ReturnType<typeof amqp.connect>> | null = null;
    try {
      conexao = await amqp.connect(uri);
      const canal = await conexao.createChannel();
      canal.publish('amq.topic', routingKey, Buffer.from(payload, 'utf8'));
      await canal.close();
      this.log('info', `atualização de firmware publicada para ${routingKey}`);
    } catch (erro) {
      this.log('erro', `falha ao publicar atualização para ${routingKey}`, erro);
      throw erro;
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
