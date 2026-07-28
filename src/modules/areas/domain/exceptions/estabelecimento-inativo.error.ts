import { AppError } from '@shared/errors/app-error.js';

/** Paridade com AreaRN.ValidarArea: "Estabelecimento X está inativo". */
export class EstabelecimentoInativoError extends AppError {
  readonly code = 'ESTABELECIMENTO_INATIVO';
  readonly httpStatus = 422;

  constructor(identificador: string) {
    super(`Estabelecimento '${identificador}' está inativo`);
  }
}
