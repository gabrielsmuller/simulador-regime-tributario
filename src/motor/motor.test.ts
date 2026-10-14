import { describe, expect, it } from 'vitest';
import {
  ATIVIDADES, AVANCADO_PADRAO, ICMS_UF, SIMPLES_2027, SIMPLES_2029,
  aliquotaEfetiva, enquadramento, resolverAnexo, simular, tabelaSimples, type Entrada,
} from './index';

/**
 * Empresa de referência para os gabaritos (contas feitas à mão, ver comentários):
 * comércio em SP, faturamento R$ 50.000/mês (RBT12 R$ 600.000), folha R$ 8.000,
 * compras R$ 30.000 (70% de fornecedores do regime regular), margem 8%,
 * CBS 9,21% e IBS 18,7% (estimativa CGIBS), ICMS 18%.
 */
const ref = (over: Partial<Entrada> = {}): Entrada => ({
  atividade: 'comercio',
  uf: 'SP',
  regimeAtual: 'SN_UNIFICADO',
  faturamentoMensal: 50_000,
  folhaMensal: 8_000,
  comprasMensais: 30_000,
  margemLucro: 0.08,
  percVendasEmpresas: 0,
  avancado: { ...AVANCADO_PADRAO, aliqIcms: ICMS_UF.SP },
  ...over,
});
const ano = (e: Entrada, a: number) => simular(e).anos.find((x) => x.ano === a)!;
const valor = (r: { linhas: { tributo: string; valor: number }[] }, t: string) => r.linhas.find((l) => l.tributo === t)?.valor ?? 0;

describe('tabelas do Simples (LC 214, Anexos XVIII a XXII)', () => {
  it('cada faixa reparte 100% do DAS, em todos os anexos e anos', () => {
    for (const a of [2027, 2029, 2030, 2031, 2032, 2033] as const) {
      for (const anexo of ['I', 'II', 'III', 'IV', 'V'] as const) {
        for (const f of tabelaSimples(anexo, a)) {
          const r = f.rep;
          expect(r.irpj + r.csll + r.cbs + r.cpp + r.ipi + r.local + r.ibs, `${anexo} ${a} até ${f.ate}`).toBeCloseTo(100, 6);
        }
      }
    }
  });

  it('a regra ICMS/ISS → IBS reproduz os valores publicados na lei', () => {
    // Anexo I, 3ª faixa, 2029: ICMS 30,15% e IBS 3,35%
    expect(tabelaSimples('I', 2029)[2].rep).toMatchObject({ local: 30.15, ibs: 3.35, cbs: 15.5 });
    // Anexo I, 1ª faixa, 2030: ICMS 27,20% e IBS 6,80%
    expect(tabelaSimples('I', 2030)[0].rep).toMatchObject({ local: 27.2, ibs: 6.8 });
    // Anexo II, 2032: ICMS 19,20% e IBS 12,80%
    expect(tabelaSimples('II', 2032)[0].rep).toMatchObject({ local: 19.2, ibs: 12.8 });
    // Anexo III, 2ª faixa, 2031: ISS 22,40% e IBS 9,60%
    expect(tabelaSimples('III', 2031)[1].rep).toMatchObject({ local: 22.4, ibs: 9.6 });
    // Anexo IV, 1ª faixa, 2029: ISS 40,05% e IBS 4,45%
    expect(tabelaSimples('IV', 2029)[0].rep).toMatchObject({ local: 40.05, ibs: 4.45 });
    // 2033: sem ICMS/ISS; Anexo V, 1ª faixa: IBS 14%
    expect(tabelaSimples('V', 2033)[0].rep).toMatchObject({ local: 0, ibs: 14, cbs: 17.15 });
  });

  it('2027–2028 usam as tabelas literais (IBS de teste e 6ª faixa reduzida)', () => {
    expect(SIMPLES_2027.I[0].rep).toMatchObject({ cbs: 15.33, ibs: 0.17, local: 34 });
    expect(SIMPLES_2027.I[5].aliq).toBe(0.189);
    expect(SIMPLES_2029.I[5].aliq).toBe(0.19);
    expect(SIMPLES_2027.V[5].aliq).toBe(0.304);
  });

  it('alíquota efetiva: Anexo I, 3ª faixa, RBT12 de R$ 600 mil = 7,19%', () => {
    const { efetiva, indice } = aliquotaEfetiva('I', 600_000, 2027);
    expect(indice).toBe(2);
    expect(efetiva).toBeCloseTo(0.0719, 10); // (600.000 × 9,5% − 13.860) ÷ 600.000
  });

  it('Fator R: folha ≥ 28% da receita vai para o Anexo III; abaixo, Anexo V', () => {
    const ativ = ATIVIDADES.servicos_intelectuais;
    expect(resolverAnexo(ativ, 28_000, 100_000).anexo).toBe('III');
    expect(resolverAnexo(ativ, 27_999, 100_000).anexo).toBe('V');
  });
});

describe('gabarito: empresa de referência', () => {
  it('2027, Simples Unificado: DAS = 50.000 × 7,19% = R$ 3.595,00', () => {
    expect(ano(ref(), 2027).regimes.SN_UNIFICADO.carga).toBeCloseTo(3595, 2);
  });

  it('2027, Simples Híbrido = R$ 5.708,68', () => {
    const r = ano(ref(), 2027).regimes.SN_HIBRIDO;
    expect(valor(r, 'DAS reduzido')).toBeCloseTo(3037.78, 1); // 3.595 × (1 − 15,33% − 0,17%)
    expect(valor(r, 'CBS')).toBeCloseTo(2641.9, 2);           // 50.000 × 9,11% − 21.000 × 9,11%
    expect(valor(r, 'IBS')).toBeCloseTo(29, 2);               // 50.000 × 0,1% − 21.000 × 0,1%
    expect(r.carga).toBeCloseTo(5708.68, 1);
  });

  it('2027, Lucro Presumido = R$ 9.303,34 (ICMS fora da base do IBS/CBS)', () => {
    const r = ano(ref(), 2027).regimes.PRESUMIDO;
    expect(valor(r, 'IRPJ')).toBeCloseTo(600, 2);           // 50.000 × 8% × 15%
    expect(valor(r, 'CSLL')).toBeCloseTo(540, 2);           // 50.000 × 12% × 9%
    expect(valor(r, 'ICMS')).toBeCloseTo(3600, 2);          // (50.000 − 30.000) × 18%
    expect(valor(r, 'CBS')).toBeCloseTo(2313.94, 2);        // 46.400 × 9,11% − 1.913,10
    expect(valor(r, 'IBS')).toBeCloseTo(25.4, 2);           // 46.400 × 0,1% − 21,00
    expect(valor(r, 'INSS patronal')).toBeCloseTo(2224, 2); // 8.000 × 27,8%
    expect(r.carga).toBeCloseTo(9303.34, 2);
  });

  it('2027, Lucro Real = R$ 9.123,34 (só IRPJ/CSLL mudam)', () => {
    const r = ano(ref(), 2027).regimes.REAL;
    expect(valor(r, 'CSLL')).toBeCloseTo(360, 2); // 4.000 × 9%
    expect(r.carga).toBeCloseTo(9123.34, 2);
  });

  it('2030, Simples Híbrido = R$ 6.552,41', () => {
    const r = ano(ref(), 2030).regimes.SN_HIBRIDO;
    expect(valor(r, 'DAS reduzido')).toBeCloseTo(2796.91, 1); // 3.595 × (1 − 15,5% − 6,7%)
    expect(valor(r, 'IBS')).toBeCloseTo(1084.6, 2);           // 29.000 × 18,7% × 20%
    expect(r.carga).toBeCloseTo(6552.41, 1);
  });

  it('2033, Lucro Presumido = R$ 11.457,90 (ICMS extinto, IBS cheio)', () => {
    const r = ano(ref(), 2033).regimes.PRESUMIDO;
    expect(valor(r, 'ICMS')).toBe(0);
    expect(valor(r, 'CBS')).toBeCloseTo(2670.9, 2); // 29.000 × 9,21%
    expect(valor(r, 'IBS')).toBeCloseTo(5423, 2);   // 29.000 × 18,7%
    expect(r.carga).toBeCloseTo(11457.9, 2);
  });

  it('Simples Unificado: DAS constante de 2027 a 2033 (mesma alíquota, muda a partilha)', () => {
    const das = simular(ref()).anos.map((a) => a.regimes.SN_UNIFICADO.carga);
    expect(new Set(das).size).toBe(1);
  });

  it('crédito ao cliente: limitado no Unificado, integral no Híbrido', () => {
    const a = ano(ref({ percVendasEmpresas: 1 }), 2033);
    expect(a.regimes.SN_UNIFICADO.creditoPorReal).toBeCloseTo(0.49 * 0.0719, 8); // (15,5% + 33,5%) do DAS
    expect(a.regimes.SN_HIBRIDO.creditoPorReal).toBeCloseTo(0.0921 + 0.187, 8);
  });
});

describe('regras específicas', () => {
  it('é determinística', () => {
    expect(simular(ref())).toEqual(simular(ref()));
  });

  it('bares e restaurantes: redução de 40% e nenhum crédito para o cliente (art. 276)', () => {
    const a = ano(ref({ atividade: 'restaurante', percVendasEmpresas: 1, comprasMensais: 0 }), 2033);
    for (const r of Object.values(a.regimes)) expect(r.creditoPorReal).toBe(0);
    expect(valor(a.regimes.REAL, 'CBS')).toBeCloseTo(50_000 * 0.0921 * 0.6, 2);
  });

  it('saúde: redução de 60% no IBS/CBS', () => {
    const cheio = ano(ref({ atividade: 'servicos', comprasMensais: 0 }), 2033).regimes.REAL;
    const saude = ano(ref({ atividade: 'saude', comprasMensais: 0 }), 2033).regimes.REAL;
    expect(valor(saude, 'CBS')).toBeCloseTo(valor(cheio, 'CBS') * 0.4, 2);
  });

  it('acima de R$ 4,8 mi o Simples fica indisponível', () => {
    const a = ano(ref({ faturamentoMensal: 450_000, regimeAtual: 'PRESUMIDO' }), 2027);
    expect(a.regimes.SN_UNIFICADO.elegivel).toBe(false);
    expect(a.regimes.SN_HIBRIDO.elegivel).toBe(false);
  });

  it('acima do sublimite, ICMS sai do DAS e é cobrado à parte', () => {
    const a = ano(ref({ faturamentoMensal: 350_000, comprasMensais: 200_000 }), 2027);
    const un = a.regimes.SN_UNIFICADO;
    expect(valor(un, 'ICMS')).toBeCloseTo(150_000 * 0.18, 2);
    expect(enquadramento(ref({ faturamentoMensal: 350_000 }), 2027)).toMatchObject({ faixa: 6, acimaSublimite: true });
  });

  it('IRPJ do Presumido com adicional de 10% acima de R$ 20 mil/mês de base', () => {
    const r = ano(ref({ faturamentoMensal: 300_000, regimeAtual: 'PRESUMIDO' }), 2027).regimes.PRESUMIDO;
    const base = 300_000 * 0.08;
    expect(valor(r, 'IRPJ')).toBeCloseTo(base * 0.15 + (base - 20_000) * 0.1, 2);
  });

  it('LC 224/2025: presunção 10% maior sobre a receita acima de R$ 5 mi/ano', () => {
    const fat = 600_000; // R$ 7,2 mi/ano
    const r = ano(ref({ faturamentoMensal: fat, regimeAtual: 'PRESUMIDO' }), 2027).regimes.PRESUMIDO;
    const excedente = fat - 5_000_000 / 12;
    expect(valor(r, 'CSLL')).toBeCloseTo((fat * 0.12 + excedente * 0.12 * 0.1) * 0.09, 2);
  });

  it('variação e menor carga são calculadas contra o regime atual', () => {
    const a = ano(ref(), 2027);
    expect(a.regimes.SN_UNIFICADO.variacao).toBe(0);
    expect(a.menor).toBe('SN_UNIFICADO');
  });

  it('caminho ótimo nunca custa mais que ficar parado', () => {
    const r = simular(ref({ faturamentoMensal: 300_000, comprasMensais: 240_000, margemLucro: 0.02, folhaMensal: 20_000 }));
    expect(r.totalMelhor).toBeLessThanOrEqual(r.totalParado);
    for (const v of r.viradas) expect(v.de).not.toBe(v.para);
  });

  it('recomendação: distribuidora no Presumido com margem baixa deve ir para o Real, explicando pelo IRPJ/CSLL', () => {
    const r = simular(ref({ regimeAtual: 'PRESUMIDO', faturamentoMensal: 380_000, folhaMensal: 35_000, comprasMensais: 300_000, margemLucro: 0.03 }));
    expect(r.anos[0].menor).toBe('REAL');
    expect(r.recomendacao.titulo).toContain('Lucro Real');
    expect(r.recomendacao.texto[0]).toContain('IRPJ/CSLL');
  });

  it('recomendação: Unificado × Híbrido é explicado pelo DAS e pelo IBS/CBS por fora', () => {
    const r = simular(ref());
    expect(r.recomendacao.titulo).toContain('permaneça no Simples Unificado');
    expect(r.recomendacao.texto[0]).toMatch(/^No Híbrido, o DAS cai/);
  });

  it('vendas a consumidor final de outro estado: DIFAL no Presumido, nada a mais no Simples', () => {
    // metade do faturamento (R$ 25.000) vendida a consumidor final na BA, saindo de SP
    const e = ref({ percVendasOutrosEstados: 0.5, ufDestinoPrincipal: 'BA' });
    const a = ano(e, 2027);
    // ICMS: 25.000 × 18% + 25.000 × 7% − 30.000 × 18% = 850
    expect(valor(a.regimes.PRESUMIDO, 'ICMS')).toBeCloseTo(850, 2);
    // DIFAL base dupla: 25.000 × (0,93 ÷ 0,795 × 20,5% − 7%) = 4.245,28
    expect(valor(a.regimes.PRESUMIDO, 'DIFAL')).toBeCloseTo(4245.28, 1);
    // ICMS e DIFAL saem da base do IBS/CBS: (50.000 − 5.095,28) × 9,11% − 1.913,10
    expect(valor(a.regimes.PRESUMIDO, 'CBS')).toBeCloseTo(2177.72, 1);
    expect(a.regimes.SN_UNIFICADO.carga).toBeCloseTo(3595, 2);
    expect(valor(a.regimes.SN_UNIFICADO, 'DIFAL')).toBe(0);
  });
});
