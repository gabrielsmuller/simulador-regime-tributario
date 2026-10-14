export const ANOS = [2027, 2028, 2029, 2030, 2031, 2032, 2033] as const;
export type Ano = (typeof ANOS)[number];

export type Regime = 'SN_UNIFICADO' | 'SN_HIBRIDO' | 'PRESUMIDO' | 'REAL';
export const REGIMES: Regime[] = ['SN_UNIFICADO', 'SN_HIBRIDO', 'PRESUMIDO', 'REAL'];

export type AtividadeId =
  | 'comercio'
  | 'industria'
  | 'restaurante'
  | 'servicos'
  | 'servicos_intelectuais'
  | 'saude'
  | 'educacao'
  | 'profissao_regulamentada'
  | 'construcao_limpeza';

export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface Atividade {
  nome: string;
  exemplos: string;
  /** 'FATOR_R' = Anexo III se folha/receita >= 28%, senão Anexo V */
  anexo: AnexoSimples | 'FATOR_R';
  tributoLocal: 'ICMS' | 'ISS';
  presuncaoIrpj: number;
  presuncaoCsll: number;
  /** Redução de alíquota de IBS/CBS (LC 214/2025): 0, 0.3, 0.4, 0.6 */
  reducaoIbsCbs: number;
  fundamentoReducao?: string;
  /** cliente PJ não pode tomar crédito (bares e restaurantes, LC 214 art. 276) */
  creditoVedado?: boolean;
  margemPadrao: number;
  /** compras / faturamento, usado como sugestão no formulário */
  comprasPadrao: number;
}

export interface Avancado {
  /** Alíquota de referência cheia da CBS (ex.: 0.088) */
  aliqCbs: number;
  /** Alíquota de referência cheia do IBS (estadual + municipal, ex.: 0.177) */
  aliqIbs: number;
  aliqIcms: number;
  aliqIss: number;
  /** Parte das compras feita de fornecedores fora do Simples (geram crédito integral) */
  percFornecedoresRegular: number;
  crescimentoAnual: number;
}

export interface Entrada {
  /** opcional, só para identificar o relatório */
  nomeEmpresa?: string;
  atividade: AtividadeId;
  uf: string;
  regimeAtual: Regime;
  faturamentoMensal: number;
  /** salários + pró-labore */
  folhaMensal: number;
  /** mercadorias, insumos e serviços comprados de empresas */
  comprasMensais: number;
  /** lucro antes de IRPJ/CSLL, em fração do faturamento */
  margemLucro: number;
  /** fração das vendas feitas para empresas (B2B) */
  percVendasEmpresas: number;
  /**
   * fração desses clientes PJ que aproveita crédito de IBS/CBS (padrão 100%).
   * Não aproveitam: optantes do Simples Unificado, MEI e quem compra para uso próprio sem direito a crédito.
   */
  percClientesComCredito?: number;
  /** fração do faturamento vendida a consumidor final de outros estados (gera DIFAL fora do Simples) */
  percVendasOutrosEstados?: number;
  /** principal estado de destino dessas vendas */
  ufDestinoPrincipal?: string;
  avancado: Avancado;
}

export type Categoria = 'DAS' | 'CBS' | 'IBS' | 'LOCAL' | 'RENDA' | 'INSS';
export const CATEGORIAS: { id: Categoria; nome: string }[] = [
  { id: 'DAS', nome: 'DAS (Simples)' },
  { id: 'CBS', nome: 'CBS' },
  { id: 'IBS', nome: 'IBS' },
  { id: 'LOCAL', nome: 'ICMS / ISS' },
  { id: 'RENDA', nome: 'IRPJ / CSLL' },
  { id: 'INSS', nome: 'INSS patronal' },
];

export interface Linha {
  tributo: string;
  categoria: Categoria;
  valor: number;
  memoria: string;
}

/** Como a empresa se enquadra no Simples em um ano (exibido no painel de dados). */
export interface Enquadramento {
  rbt12: number;
  anexo: AnexoSimples;
  fatorR: number | null;
  faixa: number;
  aliqNominal: number;
  aliqEfetiva: number;
  simplesElegivel: boolean;
  acimaSublimite: boolean;
  presumidoElegivel: boolean;
  majoracaoPresumido: boolean;
}

export interface ResultadoRegime {
  regime: Regime;
  ano: Ano;
  elegivel: boolean;
  motivo?: string;
  carga: number;
  /** carga ÷ faturamento */
  cargaEfetiva: number;
  linhas: Linha[];
  /** crédito de IBS/CBS que um cliente PJ aproveita a cada R$ 1 comprado */
  creditoPorReal: number;
  /** crédito total entregue aos clientes PJ no mês */
  creditoClientesMes: number;
  /** variação em relação ao regime atual (0.25 = +25%) */
  variacao: number | null;
}

export interface ResultadoAno {
  ano: Ano;
  faturamento: number;
  regimes: Record<Regime, ResultadoRegime>;
  menor: Regime;
}

export interface Virada {
  ano: Ano;
  de: Regime;
  para: Regime;
}

export interface Resultado {
  anos: ResultadoAno[];
  viradas: Virada[];
  /** soma 2027–2033 (12 meses por ano) ficando no regime atual */
  totalParado: number;
  /** soma 2027–2033 escolhendo o menor regime a cada ano */
  totalMelhor: number;
  recomendacao: { titulo: string; texto: string[] };
}
