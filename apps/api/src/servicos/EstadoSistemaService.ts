export type TipoComandoCarregador = "ligar" | "desligar";
export type StatusCarregador = "ligado" | "desligado";

export type DecisaoSistema = {
  comando: TipoComandoCarregador;
  status: StatusCarregador;
  geracaoSolar: number;
  consumoResidencia: number;
  excedente: number;
  economiaEstimativa: number;
  timestamp: string;
};

export class EstadoSistemaService {
  private geracaoSolar = 0;
  private consumoResidencia: number;
  private excedente = 0;
  private carregadorAtivo = false;
  private ultimaDecisao: DecisaoSistema | null = null;

  constructor(consumoInicial?: number) {
    this.consumoResidencia = consumoInicial ?? Number(process.env.CONSUMO_RESIDENCIA_PADRAO ?? 400);
  }

  public getEstado() {
    return {
      geracaoSolar: this.geracaoSolar,
      consumoResidencia: this.consumoResidencia,
      excedente: this.excedente,
      carregadorAtivo: this.carregadorAtivo,
      ultimaDecisao: this.ultimaDecisao,
    };
  }

  public definirConsumoResidencia(consumo: number) {
    this.consumoResidencia = consumo;
    return this.consumoResidencia;
  }

  public processarGeracaoSolar(geracaoSolar: number): DecisaoSistema {
    this.geracaoSolar = geracaoSolar;
    this.excedente = geracaoSolar - this.consumoResidencia;
    this.carregadorAtivo = geracaoSolar > this.consumoResidencia;

    const comando: TipoComandoCarregador = this.carregadorAtivo ? "ligar" : "desligar";
    const status: StatusCarregador = this.carregadorAtivo ? "ligado" : "desligado";

    this.ultimaDecisao = {
      comando,
      status,
      geracaoSolar: this.geracaoSolar,
      consumoResidencia: this.consumoResidencia,
      excedente: this.excedente,
      economiaEstimativa: Math.max(this.excedente, 0),
      timestamp: new Date().toISOString(),
    };

    return this.ultimaDecisao;
  }

  public definirComandoManual(comando: TipoComandoCarregador): DecisaoSistema {
    const status: StatusCarregador = comando === "ligar" ? "ligado" : "desligado";

    this.carregadorAtivo = comando === "ligar";
    this.excedente = this.geracaoSolar - this.consumoResidencia;

    this.ultimaDecisao = {
      comando,
      status,
      geracaoSolar: this.geracaoSolar,
      consumoResidencia: this.consumoResidencia,
      excedente: this.excedente,
      economiaEstimativa: Math.max(this.excedente, 0),
      timestamp: new Date().toISOString(),
    };

    return this.ultimaDecisao;
  }
}
