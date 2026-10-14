/**
 * Preço e contratos: quanto o preço precisa mudar, ano a ano, para a empresa manter
 * o mesmo resultado que tem hoje (2026, sistema atual) depois de pagar os tributos.
 */
import { aliquotaInterestadual } from './icms';
import { LIMITES } from './parametros';
import { CALCULADORAS, criarContexto } from './regimes';
import { ANOS, type Ano, type Entrada, type Linha, type Regime } from './tipos';

/** PIS/COFINS de hoje: cumulativo no Presumido (Lei 9.718/1998), não cumulativo no Real (Leis 10.637/2002 e 10.833/2003). */
export const PIS_COFINS = {
  cumulativo: { pis: 0.0065, cofins: 0.03 },
  naoCumulativo: { pis: 0.0165, cofins: 0.076 },
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number, casas = 2) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;
const centavos = (v: number) => Math.round(v * 100) / 100;

export interface CargaHoje {
  /** regime de hoje (o Híbrido ainda não existe em 2026: conta como Simples) */
  regime: Regime;
  elegivel: boolean;
  motivo?: string;
  carga: number;
  linhas: Linha[];
}

/** Sem crescimento: preço e contrato comparam a mesma operação ao longo dos anos. */
const semCrescimento = (e: Entrada): Entrada => ({ ...e, avancado: { ...e.avancado, crescimentoAnual: 0 } });

/** ICMS destacado nas vendas, que sai da base do PIS/COFINS (STF, Tema 69). */
function icmsDestacado(e: Entrada, fat: number): number {
  if (criarContexto(e, 2027).ativ.tributoLocal !== 'ICMS') return 0;
  const destino = e.ufDestinoPrincipal;
  const p = destino && destino !== e.uf ? Math.min(1, Math.max(0, e.percVendasOutrosEstados ?? 0)) : 0;
  return fat * (1 - p) * e.avancado.aliqIcms + fat * p * (p ? aliquotaInterestadual(e.uf, destino!, false) : 0);
}

/**
 * Carga mensal em 2026, no sistema atual. Reaproveita o cálculo de 2027 (ICMS/ISS, IRPJ/CSLL e INSS
 * não mudam até lá; o DAS do Simples tem a mesma alíquota total) e troca CBS/IBS por PIS/COFINS.
 */
export function cargaHoje(entrada: Entrada): CargaHoje {
  const e = semCrescimento(entrada);
  const regime: Regime = e.regimeAtual === 'SN_HIBRIDO' ? 'SN_UNIFICADO' : e.regimeAtual;
  const ctx = criarContexto(e, 2027);
  const base = CALCULADORAS[regime](ctx);
  if (!base.elegivel) return { regime, elegivel: false, motivo: base.motivo, carga: 0, linhas: [] };

  const linhas = base.linhas.filter((l) => l.categoria !== 'CBS' && l.categoria !== 'IBS')
    .map((l) => (l.categoria === 'DAS'
      ? { ...l, memoria: l.memoria.replace(/\. Partilha:.*$/, '. Mesma alíquota total do DAS de 2027') }
      : l));

  if (regime === 'PRESUMIDO' || regime === 'REAL') {
    const icms = icmsDestacado(e, ctx.fat);
    const baseVendas = Math.max(0, ctx.fat - icms);
    const icmsCompras = icms > 0 ? ctx.compras * e.avancado.aliqIcms : 0;
    const baseCompras = Math.max(0, ctx.compras - icmsCompras);
    const deducao = icms ? ` (faturamento sem o ICMS destacado de ${brl(icms)})` : '';
    if (regime === 'PRESUMIDO') {
      const a = PIS_COFINS.cumulativo;
      linhas.unshift(
        { tributo: 'PIS', categoria: 'CBS', valor: centavos(baseVendas * a.pis), memoria: `${brl(baseVendas)}${deducao} × ${pct(a.pis)} (cumulativo)` },
        { tributo: 'COFINS', categoria: 'CBS', valor: centavos(baseVendas * a.cofins), memoria: `${brl(baseVendas)}${deducao} × ${pct(a.cofins)} (cumulativo)` },
      );
    } else {
      const a = PIS_COFINS.naoCumulativo;
      const bloco = (tributo: string, aliq: number) => {
        const debito = baseVendas * aliq, credito = baseCompras * aliq;
        return {
          tributo, categoria: 'CBS' as const, valor: centavos(Math.max(0, debito - credito)),
          memoria: `Débito: ${brl(baseVendas)}${deducao} × ${pct(aliq)} = ${brl(debito)}. ` +
            `Crédito: ${brl(baseCompras)} de compras${icmsCompras ? ' sem ICMS' : ''} × ${pct(aliq)} = ${brl(credito)}`,
        };
      };
      linhas.unshift(bloco('PIS', a.pis), bloco('COFINS', a.cofins));
    }
  }
  return { regime, elegivel: true, carga: centavos(linhas.reduce((s, l) => s + l.valor, 0)), linhas };
}

export interface AjusteAno {
  ano: Ano;
  elegivel: boolean;
  motivo?: string;
  /** carga mensal no ano, com o preço de hoje */
  carga: number;
  /** 1,02 = o preço precisa subir 2% para manter o resultado de hoje */
  fator: number | null;
  /** crédito de IBS/CBS que um cliente PJ desconta a cada R$ 1 comprado, já com o preço ajustado */
  creditoPorReal: number;
}

export interface AjustePreco {
  hoje: CargaHoje;
  regime: Regime;
  anos: AjusteAno[];
}

/**
 * Fator de preço por ano para manter o resultado de hoje: faturamento − tributos, com custos fixos.
 * Resolve numericamente com o próprio motor, então respeita faixas do Simples e o adicional do IRPJ.
 * No Lucro Real, o lucro cresce junto com o preço (os custos não mudam).
 */
export function ajustePreco(entrada: Entrada, regime: Regime): AjustePreco {
  const e = semCrescimento(entrada);
  const hoje = cargaHoje(e);
  const fat = e.faturamentoMensal;
  const alvo = fat - hoje.carga;
  const custos = fat * (1 - e.margemLucro);

  const com = (k: number, ano: Ano) => {
    const ek: Entrada = { ...e, faturamentoMensal: fat * k, margemLucro: Math.max(0, 1 - custos / (fat * k)) };
    return CALCULADORAS[regime](criarContexto(ek, ano));
  };

  const anos = ANOS.map((ano): AjusteAno => {
    const r1 = com(1, ano);
    if (!r1.elegivel || !hoje.elegivel || fat <= 0) {
      return { ano, elegivel: r1.elegivel, motivo: r1.motivo ?? hoje.motivo, carga: r1.carga, fator: null, creditoPorReal: r1.creditoPorReal };
    }
    const sobra = (k: number) => { const r = com(k, ano); return r.elegivel ? fat * k - r.carga - alvo : NaN; };
    // no Simples, o preço não pode passar do teto de faturamento
    const simples = regime === 'SN_UNIFICADO' || regime === 'SN_HIBRIDO';
    let lo = 0.5, hi = simples ? Math.min(2, LIMITES.simplesTeto / 12 / fat) : 2;
    let sLo = sobra(lo), sHi = sobra(hi);
    if (!(sLo < 0 && sHi >= 0)) {
      return { ano, elegivel: true, motivo: 'O reajuste necessário passaria do teto de R$ 4,8 milhões do Simples',
        carga: r1.carga, fator: null, creditoPorReal: r1.creditoPorReal };
    }
    // falsa posição (Illinois): a carga é quase linear no preço, então converge em poucas rodadas
    let k = hi, lado = 0;
    for (let i = 0; i < 40 && hi - lo > 1e-9; i++) {
      k = hi - sHi * (hi - lo) / (sHi - sLo);
      const sk = sobra(k);
      if (Math.abs(sk) < 0.001) break;
      if (sk < 0) { lo = k; sLo = sk; if (lado === -1) sHi /= 2; lado = -1; }
      else { hi = k; sHi = sk; if (lado === 1) sLo /= 2; lado = 1; }
    }
    const fator = Math.round(k * 1e6) / 1e6;
    return { ano, elegivel: true, carga: r1.carga, fator, creditoPorReal: com(fator, ano).creditoPorReal };
  });
  return { hoje, regime, anos };
}
