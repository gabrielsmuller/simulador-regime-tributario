import { describe, expect, it } from 'vitest';
import { AVANCADO_PADRAO, ICMS_UF, ajustePreco, cargaHoje, criarContexto, simular, type Entrada } from './index';
import { CALCULADORAS } from './regimes';

/** Mesma empresa de referência do motor.test.ts: comércio em SP, R$ 50 mil/mês, compras R$ 30 mil, ICMS 18%. */
const ref = (over: Partial<Entrada> = {}): Entrada => ({
  atividade: 'comercio', uf: 'SP', regimeAtual: 'SN_UNIFICADO',
  faturamentoMensal: 50_000, folhaMensal: 8_000, comprasMensais: 30_000, margemLucro: 0.08, percVendasEmpresas: 0,
  avancado: { ...AVANCADO_PADRAO, aliqIcms: ICMS_UF.SP },
  ...over,
});
const valor = (r: { linhas: { tributo: string; valor: number }[] }, t: string) => r.linhas.find((l) => l.tributo === t)?.valor ?? 0;

describe('carga de hoje (2026, sistema atual)', () => {
  it('Simples: mesmo DAS de 2027, sem CBS/IBS à parte', () => {
    const h = cargaHoje(ref());
    // Anexo I, 3ª faixa: (600.000 × 9,5% − 13.860) ÷ 600.000 = 7,19%
    expect(h.carga).toBeCloseTo(50_000 * 0.0719, 2);
    expect(h.linhas.map((l) => l.tributo)).toEqual(['DAS']);
  });

  it('Presumido: PIS/COFINS cumulativo sobre o faturamento sem o ICMS destacado (Tema 69)', () => {
    const h = cargaHoje(ref({ regimeAtual: 'PRESUMIDO' }));
    const base = 50_000 - 50_000 * 0.18; // 41.000
    expect(valor(h, 'PIS')).toBeCloseTo(base * 0.0065, 2); // 266,50
    expect(valor(h, 'COFINS')).toBeCloseTo(base * 0.03, 2); // 1.230,00
    expect(valor(h, 'CBS') + valor(h, 'IBS')).toBe(0);
    expect(valor(h, 'ICMS')).toBeCloseTo((50_000 - 30_000) * 0.18, 2);
  });

  it('Real: PIS/COFINS não cumulativo, com crédito das compras sem ICMS', () => {
    const h = cargaHoje(ref({ regimeAtual: 'REAL' }));
    const base = 41_000 - (30_000 - 30_000 * 0.18); // 41.000 − 24.600 = 16.400
    expect(valor(h, 'PIS')).toBeCloseTo(base * 0.0165, 2); // 270,60
    expect(valor(h, 'COFINS')).toBeCloseTo(base * 0.076, 2); // 1.246,40
  });

  it('ignora o crescimento anual (compara a mesma operação)', () => {
    const e = ref({ regimeAtual: 'PRESUMIDO' });
    expect(cargaHoje({ ...e, avancado: { ...e.avancado, crescimentoAnual: 0.2 } }).carga).toBeCloseTo(cargaHoje(e).carga, 2);
  });
});

describe('ajuste de preço para manter o resultado de hoje', () => {
  it('no Simples Unificado o DAS não muda: preço igual em todos os anos', () => {
    for (const a of ajustePreco(ref(), 'SN_UNIFICADO').anos) expect(a.fator).toBeCloseTo(1, 4);
  });

  it('o fator devolve exatamente o resultado de hoje (faturamento − tributos)', () => {
    for (const regime of ['PRESUMIDO', 'REAL', 'SN_HIBRIDO'] as const) {
      const e = ref({ regimeAtual: 'PRESUMIDO' });
      const { hoje, anos } = ajustePreco(e, regime);
      for (const a of anos) {
        const k = a.fator!;
        const custos = 50_000 * (1 - e.margemLucro);
        const ek = { ...e, faturamentoMensal: 50_000 * k, margemLucro: 1 - custos / (50_000 * k) };
        const r = CALCULADORAS[regime](criarContexto(ek, a.ano));
        expect(50_000 * k - r.carga, `${regime} ${a.ano}`).toBeCloseTo(50_000 - hoje.carga, 1);
      }
    }
  });

  it('sai do Simples: sem fator quando o reajuste passaria do teto', () => {
    const e = ref({ faturamentoMensal: 399_000, comprasMensais: 50_000, regimeAtual: 'PRESUMIDO' });
    const a = ajustePreco(e, 'SN_HIBRIDO').anos.find((x) => x.ano === 2033)!;
    if (a.fator !== null) expect(399_000 * a.fator).toBeLessThanOrEqual(400_000 + 0.01);
    else expect(a.motivo).toMatch(/teto/);
  });
});

describe('clientes que aproveitam crédito', () => {
  it('o crédito entregue aos clientes é proporcional à fração que aproveita', () => {
    const cheio = simular(ref({ percVendasEmpresas: 0.8 })).anos[0].regimes.SN_HIBRIDO.creditoClientesMes;
    const metade = simular(ref({ percVendasEmpresas: 0.8, percClientesComCredito: 0.5 })).anos[0].regimes.SN_HIBRIDO.creditoClientesMes;
    expect(metade).toBeCloseTo(cheio / 2, 1);
  });

  it('sem o campo, considera que todos aproveitam (compatível com dados salvos)', () => {
    const a = simular(ref({ percVendasEmpresas: 0.8 })).anos[0].regimes.SN_HIBRIDO;
    expect(a.creditoClientesMes).toBeCloseTo(50_000 * 0.8 * a.creditoPorReal, 1);
  });
});
