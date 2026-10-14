/**
 * ICMS em vendas interestaduais: alíquota interestadual, DIFAL e substituição tributária (ST).
 *
 * Fontes: Res. Senado 22/1989 (7% e 12%) e 13/2012 (4% importados); EC 87/2015 e
 * LC 190/2022 (DIFAL); Convênio ICMS 236/2021 (DIFAL a não contribuinte);
 * Convênio ICMS 142/2018 (ST e MVA ajustada); LC 214/2025, arts. 501 e 508 (redução
 * do ICMS de 2029 a 2032 e extinção em 2033).
 */
import { ICMS_UF, TRANSICAO } from './parametros';
import type { Ano } from './tipos';

export type TipoCliente = 'nao_contribuinte' | 'revenda' | 'uso_consumo';
export type MetodoDifal = 'dupla' | 'unica';
export type QuemPaga = 'vendedor' | 'comprador' | 'das';

export const UFS = Object.keys(ICMS_UF).sort();

export const NOMES_UF: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};

/** Alíquota interna modal sem o adicional de fundo de pobreza (RJ: 20% + 2% de FECP). */
export const ICMS_INTERNA: Record<string, number> = { ...ICMS_UF, RJ: 0.2 };
/** Adicional de Fundo de Combate à Pobreza aplicado de forma geral. Em vários estados ele só vale para produtos listados. */
export const FCP_UF: Record<string, number> = Object.fromEntries(UFS.map((uf) => [uf, uf === 'RJ' ? 0.02 : 0]));

/** Estados do Sul e Sudeste, exceto ES: daqui para N, NE, CO e ES a alíquota interestadual é 7%. */
const SUL_SUDESTE = new Set(['SP', 'RJ', 'MG', 'PR', 'SC', 'RS']);

export function aliquotaInterestadual(origem: string, destino: string, importado: boolean): number {
  if (origem === destino) return ICMS_INTERNA[origem];
  if (importado) return 0.04;
  return SUL_SUDESTE.has(origem) && !SUL_SUDESTE.has(destino) ? 0.07 : 0.12;
}

export interface EntradaIcms {
  ufOrigem: string;
  ufDestino: string;
  vendedorSimples: boolean;
  tipoCliente: TipoCliente;
  importado: boolean;
  temSt: boolean;
  /** MVA original do produto no estado de destino (ex.: 0,40 = 40%) */
  mvaOriginal: number;
  /** valor das vendas para o estado: por nota ou por mês */
  valor: number;
  metodoDifal: MetodoDifal;
  /** cobra DIFAL mesmo com vendedor do Simples (cenário conservador) */
  difalNoSimples: boolean;
  /** sobrescreve a alíquota interna e o FCP do destino escolhido */
  internaDestino?: number;
  fcpDestino?: number;
}

export interface LinhaIcms {
  tributo: string;
  valor: number;
  quemPaga: QuemPaga;
  memoria: string;
}

export interface ResultadoIcms {
  uf: string;
  interna: number;
  fcp: number;
  interestadual: number;
  mvaAplicada: number | null;
  linhas: LinhaIcms[];
  icmsProprio: number;
  difal: number;
  st: number;
  /** ICMS total da operação, somando o que cabe ao vendedor e ao comprador */
  total: number;
  /** parte recolhida pelo vendedor (próprio fora do DAS, DIFAL e ST) */
  pagoVendedor: number;
  carga: number;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number, c = 2) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: c })}%`;
const cent = (v: number) => Math.round(v * 100) / 100;

/**
 * Calcula a operação para um destino. `fator` reduz todo o ICMS na transição da
 * Reforma (1 até 2028; 0,9 em 2029 … 0 em 2033).
 */
export function calcularIcms(e: EntradaIcms, uf = e.ufDestino, fator = 1): ResultadoIcms {
  const interno = uf === e.ufOrigem;
  const escolhido = uf === e.ufDestino;
  const interna = (escolhido && e.internaDestino !== undefined ? e.internaDestino : ICMS_INTERNA[uf]) * fator;
  const fcp = (escolhido && e.fcpDestino !== undefined ? e.fcpDestino : FCP_UF[uf]) * fator;
  const inter = (interno ? interna : aliquotaInterestadual(e.ufOrigem, uf, e.importado) * fator);
  const v = e.valor;
  const linhas: LinhaIcms[] = [];
  let mvaAplicada: number | null = null;

  // ICMS próprio: no Simples ele está dentro do DAS
  const aliqPropria = interno ? interna + fcp : inter;
  const proprio = v * aliqPropria;
  linhas.push({
    tributo: interno ? 'ICMS (venda interna)' : 'ICMS interestadual',
    valor: e.vendedorSimples ? 0 : proprio,
    quemPaga: e.vendedorSimples ? 'das' : 'vendedor',
    memoria: e.vendedorSimples
      ? `Recolhido dentro do DAS do Simples (seria ${brl(proprio)} = ${brl(v)} × ${pct(aliqPropria)})`
      : `${brl(v)} × ${pct(aliqPropria)}${interno ? ' (alíquota interna' + (fcp ? ' com FCP' : '') + ')' : ''}`,
  });

  // DIFAL: só em vendas interestaduais a consumidor final
  let difal = 0;
  if (!interno && (e.tipoCliente === 'nao_contribuinte' || e.tipoCliente === 'uso_consumo')) {
    const cobrar = e.tipoCliente === 'uso_consumo' || !e.vendedorSimples || e.difalNoSimples;
    // Para contribuinte (uso e consumo) a LC 190/2022 usa base dupla
    const dupla = e.tipoCliente === 'uso_consumo' || e.metodoDifal === 'dupla';
    let dif: number, fundo: number, memoria: string;
    if (dupla) {
      const base = (v - v * inter) / (1 - (interna + fcp));
      dif = Math.max(0, base * interna - v * inter);
      fundo = base * fcp;
      memoria = `Base dupla: (${brl(v)} − ${brl(v * inter)}) ÷ (1 − ${pct(interna + fcp)}) = ${brl(base)}; ` +
        `${brl(base)} × ${pct(interna)} − ${brl(v * inter)}`;
    } else {
      dif = Math.max(0, v * (interna - inter));
      fundo = v * fcp;
      memoria = `Base única: ${brl(v)} × (${pct(interna)} − ${pct(inter)})`;
    }
    const quem: QuemPaga = e.tipoCliente === 'uso_consumo' && !e.temSt ? 'comprador' : 'vendedor';
    if (!cobrar) {
      linhas.push({ tributo: 'DIFAL', valor: 0, quemPaga: 'vendedor', memoria: `Não cobrado de optante do Simples na venda a não contribuinte (seria ${brl(dif + fundo)})` });
    } else {
      difal = dif + fundo;
      linhas.push({ tributo: 'DIFAL', valor: dif, quemPaga: quem, memoria: memoria + (quem === 'comprador' ? '. Recolhido pelo comprador' : '') });
      if (fundo > 0) linhas.push({ tributo: 'FCP sobre o DIFAL', valor: fundo, quemPaga: quem, memoria: `Base × ${pct(fcp)}` });
    }
  }

  // ST: vendedor retém o ICMS das etapas seguintes na venda para revenda
  let st = 0;
  if (e.temSt && e.tipoCliente === 'revenda') {
    // MVA ajustada só em operação interestadual com vendedor fora do Simples (Conv. 142/2018, cl. 11)
    const ajustar = !interno && !e.vendedorSimples && inter < interna;
    const mva = ajustar ? ((1 + e.mvaOriginal) * (1 - inter)) / (1 - interna) - 1 : e.mvaOriginal;
    mvaAplicada = mva;
    const base = v * (1 + mva);
    const icmsSt = Math.max(0, base * interna - v * (interno ? interna : inter));
    const fundoSt = base * fcp;
    st = icmsSt + fundoSt;
    linhas.push({
      tributo: 'ICMS-ST',
      valor: icmsSt,
      quemPaga: 'vendedor',
      memoria: `${ajustar ? `MVA ajustada: (1 + ${pct(e.mvaOriginal)}) × (1 − ${pct(inter)}) ÷ (1 − ${pct(interna)}) − 1 = ${pct(mva)}. ` : `MVA ${pct(mva)}. `}` +
        `Base ${brl(v)} × ${(1 + mva).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} = ${brl(base)}; ` +
        `${brl(base)} × ${pct(interna)} − ${brl(v * (interno ? interna : inter))} de ICMS próprio`,
    });
    if (fundoSt > 0) linhas.push({ tributo: 'FCP-ST', valor: fundoSt, quemPaga: 'vendedor', memoria: `${brl(base)} × ${pct(fcp)}` });
  }

  const arred = linhas.map((l) => ({ ...l, valor: cent(l.valor) }));
  const icmsProprio = e.vendedorSimples ? 0 : cent(proprio);
  const pagoVendedor = cent(arred.filter((l) => l.quemPaga === 'vendedor').reduce((s, l) => s + l.valor, 0));
  const total = cent(arred.reduce((s, l) => s + l.valor, 0));
  return {
    uf, interna, fcp, interestadual: inter, mvaAplicada, linhas: arred,
    icmsProprio, difal: cent(difal), st: cent(st), total, pagoVendedor,
    carga: v > 0 ? total / v : 0,
  };
}

/** Todos os destinos, do menor para o maior ICMS total. */
export function rankingDestinos(e: EntradaIcms, fator = 1): ResultadoIcms[] {
  return UFS.map((uf) => calcularIcms(e, uf, fator)).sort((a, b) => a.total - b.total || a.uf.localeCompare(b.uf));
}

/** Evolução da operação no destino escolhido durante a transição da Reforma. */
export function transicaoIcms(e: EntradaIcms): { ano: 2026 | Ano; fator: number; r: ResultadoIcms }[] {
  const anos: (2026 | Ano)[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];
  return anos.map((ano) => {
    const fator = ano === 2026 ? 1 : TRANSICAO[ano].fatorLocal;
    return { ano, fator, r: calcularIcms(e, e.ufDestino, fator) };
  });
}
