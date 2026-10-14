import { describe, expect, it } from 'vitest';
import { aliquotaInterestadual, calcularIcms, rankingDestinos, transicaoIcms, type EntradaIcms } from './icms';

const base = (over: Partial<EntradaIcms> = {}): EntradaIcms => ({
  ufOrigem: 'SP', ufDestino: 'BA', vendedorSimples: false, tipoCliente: 'nao_contribuinte',
  importado: false, temSt: false, mvaOriginal: 0.4, valor: 1000, metodoDifal: 'dupla', difalNoSimples: false,
  ...over,
});
const linha = (r: { linhas: { tributo: string; valor: number }[] }, t: string) => r.linhas.find((l) => l.tributo === t)?.valor ?? 0;

describe('alíquota interestadual (Res. Senado 22/1989 e 13/2012)', () => {
  it('7% de Sul/Sudeste para N, NE, CO e ES; 12% nos demais; 4% importado', () => {
    expect(aliquotaInterestadual('SP', 'BA', false)).toBe(0.07);
    expect(aliquotaInterestadual('SP', 'ES', false)).toBe(0.07);
    expect(aliquotaInterestadual('PR', 'GO', false)).toBe(0.07);
    expect(aliquotaInterestadual('SP', 'RJ', false)).toBe(0.12);
    expect(aliquotaInterestadual('BA', 'SP', false)).toBe(0.12);
    expect(aliquotaInterestadual('ES', 'BA', false)).toBe(0.12);
    expect(aliquotaInterestadual('SC', 'AM', true)).toBe(0.04);
  });
});

describe('DIFAL a consumidor final não contribuinte', () => {
  it('base dupla: SP → BA, R$ 1.000 → DIFAL R$ 169,81', () => {
    // base = (1.000 − 70) ÷ (1 − 20,5%) = 1.169,81; DIFAL = 1.169,81 × 20,5% − 70
    const r = calcularIcms(base());
    expect(linha(r, 'ICMS interestadual')).toBeCloseTo(70, 2);
    expect(linha(r, 'DIFAL')).toBeCloseTo(169.81, 2);
    expect(r.total).toBeCloseTo(239.81, 2);
  });

  it('base única: SP → BA, R$ 1.000 → DIFAL R$ 135,00', () => {
    expect(linha(calcularIcms(base({ metodoDifal: 'unica' })), 'DIFAL')).toBeCloseTo(135, 2);
  });

  it('FCP do RJ (2%) entra na base dupla e é cobrado à parte', () => {
    // SP → RJ: 12%. base = 880 ÷ (1 − 22%) = 1.128,21; DIFAL = 1.128,21 × 20% − 120 = 105,64; FCP = 22,56
    const r = calcularIcms(base({ ufDestino: 'RJ' }));
    expect(linha(r, 'DIFAL')).toBeCloseTo(105.64, 2);
    expect(linha(r, 'FCP sobre o DIFAL')).toBeCloseTo(22.56, 2);
  });

  it('Simples: sem DIFAL por padrão, com opção de cenário conservador', () => {
    const padrao = calcularIcms(base({ vendedorSimples: true }));
    expect(padrao.total).toBe(0); // ICMS próprio está no DAS e não há DIFAL
    const conservador = calcularIcms(base({ vendedorSimples: true, difalNoSimples: true }));
    expect(linha(conservador, 'DIFAL')).toBeCloseTo(169.81, 2);
  });

  it('venda interna não tem DIFAL', () => {
    const r = calcularIcms(base({ ufDestino: 'SP' }));
    expect(r.difal).toBe(0);
    expect(linha(r, 'ICMS (venda interna)')).toBeCloseTo(180, 2);
  });
});

describe('substituição tributária', () => {
  it('MVA ajustada: 30% original, 12% interestadual, 20% interna = 43%', () => {
    // BA (origem fora do Sul/Sudeste) → PB: 12%; PB interna 20%
    const r = calcularIcms(base({ ufOrigem: 'BA', ufDestino: 'PB', tipoCliente: 'revenda', temSt: true, mvaOriginal: 0.3 }));
    expect(r.mvaAplicada).toBeCloseTo(0.43, 10);
    // base 1.430; ST = 1.430 × 20% − 120 = 166
    expect(linha(r, 'ICMS-ST')).toBeCloseTo(166, 2);
  });

  it('importado (4%) para SP: ST de R$ 233,95 com MVA original de 30%', () => {
    const r = calcularIcms(base({ ufOrigem: 'PR', ufDestino: 'SP', importado: true, tipoCliente: 'revenda', temSt: true, mvaOriginal: 0.3 }));
    // MVA ajustada = 1,3 × 0,96 ÷ 0,82 − 1 = 52,195%; ST = 1.521,95 × 18% − 40
    expect(linha(r, 'ICMS-ST')).toBeCloseTo(233.95, 1);
  });

  it('vendedor do Simples usa MVA original (sem ajuste)', () => {
    const r = calcularIcms(base({ ufOrigem: 'BA', ufDestino: 'PB', tipoCliente: 'revenda', temSt: true, mvaOriginal: 0.3, vendedorSimples: true }));
    expect(r.mvaAplicada).toBe(0.3);
    expect(linha(r, 'ICMS-ST')).toBeCloseTo(1300 * 0.2 - 120, 2);
  });

  it('venda a não contribuinte não tem ST, mesmo com produto sujeito a ST', () => {
    expect(calcularIcms(base({ temSt: true })).st).toBe(0);
  });
});

describe('ranking e transição', () => {
  it('ranking cobre os 27 estados em ordem crescente', () => {
    const r = rankingDestinos(base());
    expect(r).toHaveLength(27);
    for (let i = 1; i < r.length; i++) expect(r[i].total).toBeGreaterThanOrEqual(r[i - 1].total);
  });

  it('ICMS cai na transição e some em 2033', () => {
    const t = transicaoIcms(base());
    // 2029: alíquotas a 90% (6,3% e 18,45%). Base dupla = 937 ÷ 0,8155 = 1.148,99 → total 211,99
    expect(t.find((x) => x.ano === 2029)!.r.total).toBeCloseTo(211.99, 2);
    expect(t.find((x) => x.ano === 2033)!.r.total).toBe(0);
  });
});
