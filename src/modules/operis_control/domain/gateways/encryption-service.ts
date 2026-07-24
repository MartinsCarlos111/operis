/**
 * Porta de criptografia simétrica para segredos do Control Plane (a senha do
 * banco de cada tenant). Nome herdado da especificação da arquitetura
 * ("EncryptionService"). O adaptador usa AES-256-GCM com chave mestra vinda
 * exclusivamente de variável de ambiente — a chave nunca toca o banco.
 */
export interface SegredoCifrado {
  /** Payload serializado (versão + iv + authTag + ciphertext). */
  valor: string;
  /** Versão da estratégia de criptografia usada (permite rotação de chave). */
  versao: number;
}

export interface EncryptionService {
  cifrar(textoPuro: string): SegredoCifrado;
  decifrar(cifrado: SegredoCifrado): string;
}
