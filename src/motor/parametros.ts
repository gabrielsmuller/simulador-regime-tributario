/**
 * Parâmetros legais do motor. Todo número de lei fica aqui, com a fonte ao lado,
 * nunca espalhado pelo código de cálculo.
 *
 * Validado em 13/10/2026 contra o texto da LC 214/2025 publicado no Planalto
 * (com as alterações da LC 227/2026), Anexos XVIII a XXII.
 */
import type { Ano, AnexoSimples, Atividade, AtividadeId, Avancado, Regime } from './tipos';

export const VERSAO_PARAMETROS = '2026-10-13';

export const NOMES_REGIME: Record<Regime, { nome: string; curto: string; sub: string }> = {
  SN_UNIFICADO: { nome: 'Simples Unificado', curto: 'Unificado', sub: 'IBS e CBS dentro do DAS' },
  SN_HIBRIDO: { nome: 'Simples Híbrido', curto: 'Híbrido', sub: 'DAS reduzido + IBS/CBS por fora' },
  PRESUMIDO: { nome: 'Lucro Presumido', curto: 'Presumido', sub: 'Lucro presumido + IBS/CBS' },
  REAL: { nome: 'Lucro Real', curto: 'Real', sub: 'Lucro real + IBS/CBS' },
};

/** Cronograma da transição: LC 214/2025, arts. 343–364 (IBS/CBS), 501 (ICMS) e 508 (ISS). */
export interface ParametroTransicao {
  /** fração da alíquota atual de ICMS/ISS que ainda é cobrada */
  fatorLocal: number;
  /** fração da alíquota de referência do IBS em vigor */
  fracIbs: number;
  /** redução da CBS em pontos (2027–2028: −0,1 p.p.) */
  reducaoCbs: number;
  /** alíquota fixa do IBS em 2027–2028 (0,05% estadual + 0,05% municipal) */
  ibsFixo?: number;
}

export const TRANSICAO: Record<Ano, ParametroTransicao> = {
  2027: { fatorLocal: 1, fracIbs: 0, reducaoCbs: 0.001, ibsFixo: 0.001 },
  2028: { fatorLocal: 1, fracIbs: 0, reducaoCbs: 0.001, ibsFixo: 0.001 },
  2029: { fatorLocal: 0.9, fracIbs: 0.1, reducaoCbs: 0 },
  2030: { fatorLocal: 0.8, fracIbs: 0.2, reducaoCbs: 0 },
  2031: { fatorLocal: 0.7, fracIbs: 0.3, reducaoCbs: 0 },
  2032: { fatorLocal: 0.6, fracIbs: 0.4, reducaoCbs: 0 },
  2033: { fatorLocal: 0, fracIbs: 1, reducaoCbs: 0 },
};

export const LIMITES = {
  simplesTeto: 4_800_000,
  simplesSublimite: 3_600_000,
  presumidoTeto: 78_000_000,
  fatorR: 0.28,
  /** LC 224/2025, art. 4º, § 4º, VII: presunção 10% maior sobre a receita anual acima de R$ 5 mi */
  presumidoMajoracaoAcima: 5_000_000,
  presumidoMajoracao: 0.1,
  irpj: 0.15,
  irpjAdicional: 0.1,
  irpjAdicionalLimiteMes: 20_000,
  csll: 0.09,
  /** INSS patronal 20% + RAT 2% + terceiros 5,8% */
  cppRegular: 0.278,
  /** Anexo IV do Simples: 20% + RAT 2% (sem terceiros) */
  cppAnexoIV: 0.22,
};

/**
 * Alíquotas de referência: ainda não fixadas pelo Senado (prazo: 15/12/2026).
 * Padrão = estimativa metodológica do Comitê Gestor do IBS (Res. CGIBS nº 14/2026):
 * IBS 18,7% em uma alíquota conjunta de 27,91%, o que deixa a CBS em 9,21%.
 */
export const AVANCADO_PADRAO: Omit<Avancado, 'aliqIcms'> = {
  aliqCbs: 0.0921,
  aliqIbs: 0.187,
  aliqIss: 0.05,
  percFornecedoresRegular: 0.7,
  crescimentoAnual: 0,
};

export const ATIVIDADES: Record<AtividadeId, Atividade> = {
  comercio: {
    nome: 'Comércio', exemplos: 'Loja, varejo, atacado, e-commerce',
    anexo: 'I', tributoLocal: 'ICMS', presuncaoIrpj: 0.08, presuncaoCsll: 0.12,
    reducaoIbsCbs: 0, margemPadrao: 0.08, comprasPadrao: 0.6,
  },
  industria: {
    nome: 'Indústria', exemplos: 'Fabricação, transformação, confecção',
    anexo: 'II', tributoLocal: 'ICMS', presuncaoIrpj: 0.08, presuncaoCsll: 0.12,
    reducaoIbsCbs: 0, margemPadrao: 0.1, comprasPadrao: 0.5,
  },
  restaurante: {
    nome: 'Bar ou restaurante', exemplos: 'Restaurante, lanchonete, bar',
    anexo: 'I', tributoLocal: 'ICMS', presuncaoIrpj: 0.08, presuncaoCsll: 0.12,
    reducaoIbsCbs: 0.4, creditoVedado: true, margemPadrao: 0.1, comprasPadrao: 0.4,
    fundamentoReducao: 'LC 214, art. 275 (−40%); art. 276 veda o crédito ao cliente',
  },
  servicos: {
    nome: 'Serviços em geral', exemplos: 'Manutenção, beleza, academia, agência',
    anexo: 'III', tributoLocal: 'ISS', presuncaoIrpj: 0.32, presuncaoCsll: 0.32,
    reducaoIbsCbs: 0, margemPadrao: 0.2, comprasPadrao: 0.15,
  },
  servicos_intelectuais: {
    nome: 'Serviços técnicos', exemplos: 'Tecnologia, consultoria, publicidade, design',
    anexo: 'FATOR_R', tributoLocal: 'ISS', presuncaoIrpj: 0.32, presuncaoCsll: 0.32,
    reducaoIbsCbs: 0, margemPadrao: 0.3, comprasPadrao: 0.1,
  },
  saude: {
    nome: 'Saúde', exemplos: 'Clínica, consultório, odontologia, fisioterapia',
    anexo: 'FATOR_R', tributoLocal: 'ISS', presuncaoIrpj: 0.32, presuncaoCsll: 0.32,
    reducaoIbsCbs: 0.6, margemPadrao: 0.3, comprasPadrao: 0.15,
    fundamentoReducao: 'LC 214, art. 130 (−60%, serviços do Anexo III da lei)',
  },
  educacao: {
    nome: 'Educação', exemplos: 'Escola, curso, creche',
    anexo: 'III', tributoLocal: 'ISS', presuncaoIrpj: 0.32, presuncaoCsll: 0.32,
    reducaoIbsCbs: 0.6, margemPadrao: 0.15, comprasPadrao: 0.1,
    fundamentoReducao: 'LC 214, art. 129 (−60%, serviços do Anexo II da lei)',
  },
  profissao_regulamentada: {
    nome: 'Profissão regulamentada', exemplos: 'Contabilidade, engenharia, arquitetura',
    anexo: 'FATOR_R', tributoLocal: 'ISS', presuncaoIrpj: 0.32, presuncaoCsll: 0.32,
    reducaoIbsCbs: 0.3, margemPadrao: 0.3, comprasPadrao: 0.1,
    fundamentoReducao: 'LC 214, art. 127 (−30%, profissões com conselho)',
  },
  construcao_limpeza: {
    nome: 'Construção e limpeza', exemplos: 'Obras, limpeza, vigilância (Anexo IV)',
    anexo: 'IV', tributoLocal: 'ISS', presuncaoIrpj: 0.32, presuncaoCsll: 0.32,
    reducaoIbsCbs: 0, margemPadrao: 0.12, comprasPadrao: 0.2,
  },
};

/** Alíquota modal interna de ICMS por UF em 2026 (aproximada, editável). */
export const ICMS_UF: Record<string, number> = {
  AC: 0.19, AL: 0.205, AM: 0.2, AP: 0.18, BA: 0.205, CE: 0.2, DF: 0.2, ES: 0.17,
  GO: 0.19, MA: 0.23, MG: 0.18, MS: 0.17, MT: 0.17, PA: 0.19, PB: 0.2, PE: 0.205,
  PI: 0.225, PR: 0.195, RJ: 0.22, RN: 0.2, RO: 0.195, RR: 0.2, RS: 0.17, SC: 0.17,
  SE: 0.2, SP: 0.18, TO: 0.2,
};

// ---------------------------------------------------------------------------
// Simples Nacional — LC 123/2006 com a redação dos Anexos XVIII a XXII da LC 214/2025
// ---------------------------------------------------------------------------

/** Repartição do DAS em % por tributo. `local` = ICMS (Anexos I e II) ou ISS (III, IV e V). */
export interface Reparticao {
  irpj: number; csll: number; cbs: number; cpp: number; ipi: number; local: number; ibs: number;
}
export interface FaixaSimples {
  ate: number;
  aliq: number;
  deduzir: number;
  rep: Reparticao;
}

const LIM = [180_000, 360_000, 720_000, 1_800_000, 3_600_000, 4_800_000];
const tabela = (linhas: [number, number, Partial<Reparticao>][]): FaixaSimples[] =>
  linhas.map(([aliq, deduzir, rep], i) => ({
    ate: LIM[i], aliq, deduzir,
    rep: { irpj: 0, csll: 0, cbs: 0, cpp: 0, ipi: 0, local: 0, ibs: 0, ...rep },
  }));

/** Anos-calendário 2027 e 2028: tabelas literais da LC 214 (IBS de teste dentro do DAS). */
export const SIMPLES_2027: Record<AnexoSimples, FaixaSimples[]> = {
  I: tabela([
    [0.04, 0, { irpj: 5.5, csll: 3.5, cbs: 15.33, cpp: 41.5, local: 34, ibs: 0.17 }],
    [0.073, 5_940, { irpj: 5.5, csll: 3.5, cbs: 15.33, cpp: 41.5, local: 34, ibs: 0.17 }],
    [0.095, 13_860, { irpj: 5.5, csll: 3.5, cbs: 15.33, cpp: 42, local: 33.5, ibs: 0.17 }],
    [0.107, 22_500, { irpj: 5.5, csll: 3.5, cbs: 15.33, cpp: 42, local: 33.5, ibs: 0.17 }],
    [0.143, 87_300, { irpj: 5.5, csll: 3.5, cbs: 15.33, cpp: 42, local: 33.5, ibs: 0.17 }],
    [0.189, 378_000, { irpj: 13.58, csll: 10.06, cbs: 34.02, cpp: 42.34 }],
  ]),
  II: tabela([
    [0.045, 0, { irpj: 5.5, csll: 3.5, cbs: 13.85, cpp: 37.5, ipi: 7.5, local: 32, ibs: 0.15 }],
    [0.078, 5_940, { irpj: 5.5, csll: 3.5, cbs: 13.85, cpp: 37.5, ipi: 7.5, local: 32, ibs: 0.15 }],
    [0.1, 13_860, { irpj: 5.5, csll: 3.5, cbs: 13.85, cpp: 37.5, ipi: 7.5, local: 32, ibs: 0.15 }],
    [0.112, 22_500, { irpj: 5.5, csll: 3.5, cbs: 13.85, cpp: 37.5, ipi: 7.5, local: 32, ibs: 0.15 }],
    [0.147, 85_500, { irpj: 5.5, csll: 3.5, cbs: 13.85, cpp: 37.5, ipi: 7.5, local: 32, ibs: 0.15 }],
    [0.299, 720_000, { irpj: 8.53, csll: 7.53, cbs: 25.22, cpp: 23.59, ipi: 35.13 }],
  ]),
  III: tabela([
    [0.06, 0, { irpj: 4, csll: 3.5, cbs: 15.43, cpp: 43.4, local: 33.5, ibs: 0.17 }],
    [0.112, 9_360, { irpj: 4, csll: 3.5, cbs: 16.91, cpp: 43.4, local: 32, ibs: 0.19 }],
    [0.135, 17_640, { irpj: 4, csll: 3.5, cbs: 16.41, cpp: 43.4, local: 32.5, ibs: 0.19 }],
    [0.16, 35_640, { irpj: 4, csll: 3.5, cbs: 16.41, cpp: 43.4, local: 32.5, ibs: 0.19 }],
    [0.21, 125_640, { irpj: 4, csll: 3.5, cbs: 15.43, cpp: 43.4, local: 33.5, ibs: 0.17 }],
    [0.329, 648_000, { irpj: 35.09, csll: 15.04, cbs: 19.29, cpp: 30.58 }],
  ]),
  IV: tabela([
    [0.045, 0, { irpj: 18.8, csll: 15.2, cbs: 21.26, local: 44.5, ibs: 0.24 }],
    [0.09, 8_100, { irpj: 19.8, csll: 15.2, cbs: 24.73, local: 40, ibs: 0.27 }],
    [0.102, 12_420, { irpj: 20.8, csll: 15.2, cbs: 23.74, local: 40, ibs: 0.26 }],
    [0.14, 39_780, { irpj: 17.8, csll: 19.2, cbs: 22.75, local: 40, ibs: 0.25 }],
    [0.22, 183_780, { irpj: 18.8, csll: 19.2, cbs: 21.76, local: 40, ibs: 0.24 }],
    [0.329, 828_000, { irpj: 53.71, csll: 21.59, cbs: 24.7 }],
  ]),
  V: tabela([
    [0.155, 0, { irpj: 25, csll: 15, cbs: 16.96, cpp: 28.85, local: 14, ibs: 0.19 }],
    [0.18, 4_500, { irpj: 23, csll: 15, cbs: 16.96, cpp: 27.85, local: 17, ibs: 0.19 }],
    [0.195, 9_900, { irpj: 24, csll: 15, cbs: 17.95, cpp: 23.85, local: 19, ibs: 0.2 }],
    [0.205, 17_100, { irpj: 21, csll: 15, cbs: 18.94, cpp: 23.85, local: 21, ibs: 0.21 }],
    [0.23, 62_100, { irpj: 23, csll: 12.5, cbs: 16.96, cpp: 23.85, local: 23.5, ibs: 0.19 }],
    [0.304, 540_000, { irpj: 35.1, csll: 15.54, cbs: 19.78, cpp: 29.58 }],
  ]),
};

/**
 * A partir de 2029: alíquotas e partilha-base da LC 214. A cada ano, a fatia de
 * ICMS/ISS (`local`) é multiplicada pelo fator da transição e a diferença vai para
 * o IBS. Ex.: Anexo I, 3ª faixa, 2029: ICMS 33,5% × 0,9 = 30,15% e IBS 3,35%,
 * exatamente como na tabela da lei.
 */
export const SIMPLES_2029: Record<AnexoSimples, FaixaSimples[]> = {
  I: tabela([
    [0.04, 0, { irpj: 5.5, csll: 3.5, cbs: 15.5, cpp: 41.5, local: 34 }],
    [0.073, 5_940, { irpj: 5.5, csll: 3.5, cbs: 15.5, cpp: 41.5, local: 34 }],
    [0.095, 13_860, { irpj: 5.5, csll: 3.5, cbs: 15.5, cpp: 42, local: 33.5 }],
    [0.107, 22_500, { irpj: 5.5, csll: 3.5, cbs: 15.5, cpp: 42, local: 33.5 }],
    [0.143, 87_300, { irpj: 5.5, csll: 3.5, cbs: 15.5, cpp: 42, local: 33.5 }],
    [0.19, 378_000, { irpj: 13.5, csll: 10, cbs: 34.4, cpp: 42.1 }],
  ]),
  II: tabela([
    [0.045, 0, { irpj: 5.5, csll: 3.5, cbs: 14, cpp: 37.5, ipi: 7.5, local: 32 }],
    [0.078, 5_940, { irpj: 5.5, csll: 3.5, cbs: 14, cpp: 37.5, ipi: 7.5, local: 32 }],
    [0.1, 13_860, { irpj: 5.5, csll: 3.5, cbs: 14, cpp: 37.5, ipi: 7.5, local: 32 }],
    [0.112, 22_500, { irpj: 5.5, csll: 3.5, cbs: 14, cpp: 37.5, ipi: 7.5, local: 32 }],
    [0.147, 85_500, { irpj: 5.5, csll: 3.5, cbs: 14, cpp: 37.5, ipi: 7.5, local: 32 }],
    [0.3, 720_000, { irpj: 8.5, csll: 7.5, cbs: 25.5, cpp: 23.5, ipi: 35 }],
  ]),
  III: tabela([
    [0.06, 0, { irpj: 4, csll: 3.5, cbs: 15.6, cpp: 43.4, local: 33.5 }],
    [0.112, 9_360, { irpj: 4, csll: 3.5, cbs: 17.1, cpp: 43.4, local: 32 }],
    [0.135, 17_640, { irpj: 4, csll: 3.5, cbs: 16.6, cpp: 43.4, local: 32.5 }],
    [0.16, 35_640, { irpj: 4, csll: 3.5, cbs: 16.6, cpp: 43.4, local: 32.5 }],
    [0.21, 125_640, { irpj: 4, csll: 3.5, cbs: 15.6, cpp: 43.4, local: 33.5 }],
    [0.33, 648_000, { irpj: 35, csll: 15, cbs: 19.5, cpp: 30.5 }],
  ]),
  IV: tabela([
    [0.045, 0, { irpj: 18.8, csll: 15.2, cbs: 21.5, local: 44.5 }],
    [0.09, 8_100, { irpj: 19.8, csll: 15.2, cbs: 25, local: 40 }],
    [0.102, 12_420, { irpj: 20.8, csll: 15.2, cbs: 24, local: 40 }],
    [0.14, 39_780, { irpj: 17.8, csll: 19.2, cbs: 23, local: 40 }],
    [0.22, 183_780, { irpj: 18.8, csll: 19.2, cbs: 22, local: 40 }],
    [0.33, 828_000, { irpj: 53.5, csll: 21.5, cbs: 25 }],
  ]),
  V: tabela([
    [0.155, 0, { irpj: 25, csll: 15, cbs: 17.15, cpp: 28.85, local: 14 }],
    [0.18, 4_500, { irpj: 23, csll: 15, cbs: 17.15, cpp: 27.85, local: 17 }],
    [0.195, 9_900, { irpj: 24, csll: 15, cbs: 18.15, cpp: 23.85, local: 19 }],
    [0.205, 17_100, { irpj: 21, csll: 15, cbs: 19.15, cpp: 23.85, local: 21 }],
    [0.23, 62_100, { irpj: 23, csll: 12.5, cbs: 17.15, cpp: 23.85, local: 23.5 }],
    [0.305, 540_000, { irpj: 35, csll: 15.5, cbs: 20, cpp: 29.5 }],
  ]),
};

/** Tabela do Simples aplicável ao ano, com a partilha ICMS/ISS → IBS já calculada. */
export function tabelaSimples(anexo: AnexoSimples, ano: Ano): FaixaSimples[] {
  if (ano <= 2028) return SIMPLES_2027[anexo];
  const fator = TRANSICAO[ano].fatorLocal;
  return SIMPLES_2029[anexo].map((f) => {
    const local = Math.round(f.rep.local * fator * 100) / 100;
    return { ...f, rep: { ...f.rep, local, ibs: Math.round((f.rep.local - local) * 100) / 100 } };
  });
}

/** Fontes exibidas na tela de premissas. */
export const FONTES = [
  { item: 'Cronograma da transição (CBS, IBS, ICMS e ISS)', fonte: 'LC 214/2025, arts. 343–364, 501 e 508' },
  { item: 'Tabelas e partilha do Simples Nacional 2027–2033', fonte: 'LC 214/2025, Anexos XVIII a XXII (redação da LC 227/2026)' },
  { item: 'Opção pelo IBS/CBS fora do DAS (Simples Híbrido)', fonte: 'LC 214/2025, art. 41; Res. CGSN 186/2026 e 194/2026' },
  { item: 'Alíquotas de referência IBS 18,7% e CBS 9,21% (estimativa)', fonte: 'Res. CGIBS nº 14/2026; fixação pelo Senado até 15/12/2026' },
  { item: 'ICMS, ISS e PIS/Cofins fora da base do IBS/CBS', fonte: 'LC 214/2025, art. 12, § 2º' },
  { item: 'Reduções de 30%, 40% e 60%', fonte: 'LC 214/2025, arts. 127, 129, 130 e 275' },
  { item: 'Presunção 10% maior acima de R$ 5 milhões', fonte: 'LC 224/2025 (questionada no STF, ADI 7.920)' },
];
