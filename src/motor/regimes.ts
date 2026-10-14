import { aliquotaInterestadual, calcularIcms } from './icms';
import { ATIVIDADES, LIMITES, TRANSICAO, tabelaSimples, type FaixaSimples } from './parametros';
import type { AnexoSimples, Ano, Atividade, Categoria, Enquadramento, Entrada, Linha, Regime, ResultadoRegime } from './tipos';

export interface Contexto {
  ano: Ano;
  e: Entrada;
  ativ: Atividade;
  /** valores mensais já projetados para o ano */
  fat: number;
  folha: number;
  compras: number;
  rbt12: number;
  folha12: number;
}

const pct = (v: number, casas = 2) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const centavos = (v: number) => Math.round(v * 100) / 100;
const linha = (tributo: string, categoria: Categoria, valor: number, memoria: string): Linha => ({ tributo, categoria, valor, memoria });

export function criarContexto(e: Entrada, ano: Ano): Contexto {
  const g = Math.pow(1 + e.avancado.crescimentoAnual, ano - 2026);
  const fat = e.faturamentoMensal * g;
  const folha = e.folhaMensal * g;
  return {
    ano, e, ativ: ATIVIDADES[e.atividade],
    fat, folha, compras: e.comprasMensais * g,
    rbt12: fat * 12, folha12: folha * 12,
  };
}

// ---------------------------------------------------------------------------
// Blocos comuns
// ---------------------------------------------------------------------------

/** Alíquotas cheias de CBS e IBS no ano, antes de reduções setoriais. */
export function aliquotasIva(ctx: Contexto) {
  const t = TRANSICAO[ctx.ano];
  return {
    cbs: ctx.e.avancado.aliqCbs - t.reducaoCbs,
    ibs: t.ibsFixo ?? ctx.e.avancado.aliqIbs * t.fracIbs,
  };
}

/**
 * IBS/CBS no regime regular: débito − crédito sobre compras.
 * ICMS e ISS cobrados à parte não integram a base (LC 214, art. 12, § 2º).
 */
function ivaRegular(ctx: Contexto, incluir: { cbs: boolean; ibs: boolean }, deducaoBase = 0): Linha[] {
  const { cbs, ibs } = aliquotasIva(ctx);
  const red = ctx.ativ.reducaoIbsCbs;
  const base = Math.max(0, ctx.fat - deducaoBase);
  const comprasCredito = ctx.compras * ctx.e.avancado.percFornecedoresRegular;
  const linhas: Linha[] = [];
  const bloco = (nome: 'CBS' | 'IBS', aliq: number) => {
    const debito = base * aliq * (1 - red);
    const credito = comprasCredito * aliq;
    linhas.push(linha(nome, nome, Math.max(0, debito - credito),
      `Débito: ${brl(base)}${deducaoBase ? ' (faturamento sem ICMS/ISS)' : ''} × ${pct(aliq)}` +
      `${red ? ` × (1 − ${pct(red, 0)})` : ''} = ${brl(debito)}. ` +
      `Crédito: ${brl(comprasCredito)} em compras de fornecedores do regime regular × ${pct(aliq)} = ${brl(credito)}` +
      (credito > debito ? '. Saldo credor: nada a pagar no mês' : '')));
  };
  if (incluir.cbs) bloco('CBS', cbs);
  if (incluir.ibs) bloco('IBS', ibs);
  return linhas;
}

/**
 * ICMS ou ISS fora do DAS, reduzidos ano a ano até a extinção em 2033.
 * Vendas a consumidor final de outros estados saem com a alíquota interestadual
 * e geram DIFAL para o destino (EC 87/2015; LC 190/2022), exceto no Simples.
 */
function tributosLocais(ctx: Contexto, semDifal: boolean): Linha[] {
  const fator = TRANSICAO[ctx.ano].fatorLocal;
  const nome = ctx.ativ.tributoLocal;
  if (fator === 0) return [linha(nome, 'LOCAL', 0, `${nome} extinto em 2033 e substituído pelo IBS`)];
  const reducao = fator < 1 ? ` × ${pct(fator, 0)} da alíquota (transição)` : '';
  if (nome === 'ISS') {
    return [linha('ISS', 'LOCAL', ctx.fat * ctx.e.avancado.aliqIss * fator, `${brl(ctx.fat)} × ${pct(ctx.e.avancado.aliqIss)}${reducao}`)];
  }
  const interna = ctx.e.avancado.aliqIcms * fator;
  const destino = ctx.e.ufDestinoPrincipal;
  const p = destino && destino !== ctx.e.uf ? Math.min(1, Math.max(0, ctx.e.percVendasOutrosEstados ?? 0)) : 0;
  if (p === 0) {
    const base = Math.max(0, ctx.fat - ctx.compras);
    return [linha('ICMS', 'LOCAL', base * interna,
      `(${brl(ctx.fat)} de vendas − ${brl(ctx.compras)} de compras) × ${pct(ctx.e.avancado.aliqIcms)}${reducao}`)];
  }
  const inter = aliquotaInterestadual(ctx.e.uf, destino!, false) * fator;
  const vendasFora = ctx.fat * p;
  const debito = (ctx.fat - vendasFora) * interna + vendasFora * inter;
  const credito = ctx.compras * interna;
  const linhas = [linha('ICMS', 'LOCAL', Math.max(0, debito - credito),
    `Débito: ${brl(ctx.fat - vendasFora)} no estado × ${pct(interna)} + ${brl(vendasFora)} para ${destino} × ${pct(inter)}; ` +
    `crédito: ${brl(ctx.compras)} de compras × ${pct(interna)}${fator < 1 ? ' (alíquotas já reduzidas pela transição)' : ''}`)];
  if (semDifal) return linhas;
  // DIFAL sobre as vendas ao destino (base dupla), já com o fator da transição
  const difal = calcularIcms({
    ufOrigem: ctx.e.uf, ufDestino: destino!, vendedorSimples: false, tipoCliente: 'nao_contribuinte', importado: false,
    temSt: false, mvaOriginal: 0, valor: vendasFora, metodoDifal: 'dupla', difalNoSimples: false,
  }, destino!, fator).difal;
  linhas.push(linha('DIFAL', 'LOCAL', difal,
    `${brl(vendasFora)} vendidos a consumidor final em ${destino}: diferença até a alíquota interna do destino, base dupla (${pct(vendasFora ? difal / vendasFora : 0)} da venda)`));
  return linhas;
}

function cpp(ctx: Contexto, aliq: number, rotulo: string): Linha {
  return linha('INSS patronal', 'INSS', ctx.folha * aliq, `Folha de ${brl(ctx.folha)} × ${pct(aliq, 1)} (${rotulo})`);
}

function irpjCsll(baseIrpj: number, baseCsll: number, descricao: string): Linha[] {
  const adicional = Math.max(0, baseIrpj - LIMITES.irpjAdicionalLimiteMes) * LIMITES.irpjAdicional;
  return [
    linha('IRPJ', 'RENDA', baseIrpj * LIMITES.irpj + adicional,
      `${descricao}: base de ${brl(baseIrpj)} × 15%` +
      (adicional ? ` + adicional de 10% sobre o que passa de R$ 20 mil/mês (${brl(adicional)})` : '')),
    linha('CSLL', 'RENDA', baseCsll * LIMITES.csll, `Base de ${brl(baseCsll)} × 9%`),
  ];
}

function fechar(regime: Regime, ctx: Contexto, linhas: Linha[], creditoPorReal: number): ResultadoRegime {
  const arred = linhas.map((l) => ({ ...l, valor: centavos(l.valor) }));
  const carga = centavos(arred.reduce((s, l) => s + l.valor, 0));
  const credito = ctx.ativ.creditoVedado ? 0 : creditoPorReal;
  return {
    regime, ano: ctx.ano, elegivel: true,
    carga,
    cargaEfetiva: ctx.fat > 0 ? carga / ctx.fat : 0,
    linhas: arred,
    creditoPorReal: credito,
    creditoClientesMes: centavos(ctx.fat * ctx.e.percVendasEmpresas * credito),
    variacao: null,
  };
}

function inelegivel(regime: Regime, ctx: Contexto, motivo: string): ResultadoRegime {
  return { regime, ano: ctx.ano, elegivel: false, motivo, carga: 0, cargaEfetiva: 0, linhas: [], creditoPorReal: 0, creditoClientesMes: 0, variacao: null };
}

// ---------------------------------------------------------------------------
// Simples Nacional
// ---------------------------------------------------------------------------

export function resolverAnexo(ativ: Atividade, folha12: number, rbt12: number): { anexo: AnexoSimples; fatorR: number | null } {
  if (ativ.anexo !== 'FATOR_R') return { anexo: ativ.anexo, fatorR: null };
  const fatorR = rbt12 > 0 ? folha12 / rbt12 : 0;
  return { anexo: fatorR >= LIMITES.fatorR ? 'III' : 'V', fatorR };
}

export function aliquotaEfetiva(anexo: AnexoSimples, rbt12: number, ano: Ano = 2029): { faixa: FaixaSimples; indice: number; efetiva: number } {
  const faixas = tabelaSimples(anexo, ano);
  const i = faixas.findIndex((f) => rbt12 <= f.ate);
  const indice = i < 0 ? faixas.length - 1 : i;
  const faixa = faixas[indice];
  const efetiva = rbt12 > 0 ? (rbt12 * faixa.aliq - faixa.deduzir) / rbt12 : faixa.aliq;
  return { faixa, indice, efetiva };
}

export function enquadramento(e: Entrada, ano: Ano): Enquadramento {
  const ctx = criarContexto(e, ano);
  const { anexo, fatorR } = resolverAnexo(ctx.ativ, ctx.folha12, ctx.rbt12);
  const { faixa, indice, efetiva } = aliquotaEfetiva(anexo, ctx.rbt12, ano);
  return {
    rbt12: ctx.rbt12, anexo, fatorR, faixa: indice + 1, aliqNominal: faixa.aliq, aliqEfetiva: efetiva,
    simplesElegivel: ctx.rbt12 <= LIMITES.simplesTeto,
    acimaSublimite: ctx.rbt12 > LIMITES.simplesSublimite,
    presumidoElegivel: ctx.rbt12 <= LIMITES.presumidoTeto,
    majoracaoPresumido: ctx.rbt12 > LIMITES.presumidoMajoracaoAcima,
  };
}

function simples(ctx: Contexto, hibrido: boolean): ResultadoRegime {
  const regime: Regime = hibrido ? 'SN_HIBRIDO' : 'SN_UNIFICADO';
  if (ctx.rbt12 > LIMITES.simplesTeto) {
    return inelegivel(regime, ctx, `Faturamento anual de ${brl(ctx.rbt12)} acima do teto de R$ 4,8 milhões`);
  }
  const { anexo, fatorR } = resolverAnexo(ctx.ativ, ctx.folha12, ctx.rbt12);
  const { faixa, indice, efetiva } = aliquotaEfetiva(anexo, ctx.rbt12, ctx.ano);
  const rep = faixa.rep;
  const fatiaCbs = rep.cbs / 100, fatiaIbs = rep.ibs / 100, fatiaLocal = rep.local / 100;
  const acimaSublimite = ctx.rbt12 > LIMITES.simplesSublimite;
  const das = ctx.fat * efetiva;
  const { cbs, ibs } = aliquotasIva(ctx);
  const red = ctx.ativ.reducaoIbsCbs;

  const cabecalho =
    `Anexo ${anexo}${fatorR !== null ? ` (Fator R de ${pct(fatorR, 1)})` : ''}, ${indice + 1}ª faixa: ` +
    `(${brl(ctx.rbt12)} × ${pct(faixa.aliq)} − ${brl(faixa.deduzir)}) ÷ ${brl(ctx.rbt12)} = alíquota efetiva de ${pct(efetiva)}`;

  const linhas: Linha[] = [];
  let creditoPorReal: number;
  // Optante do Simples não recolhe DIFAL na venda a não contribuinte (STF, ADI 5464)
  const locais = acimaSublimite ? tributosLocais(ctx, true) : null;
  const valorLocal = locais ? locais.reduce((t, l) => t + l.valor, 0) : 0;

  if (!hibrido) {
    linhas.push(linha('DAS', 'DAS', das,
      `${cabecalho}. Partilha: CBS ${pct(fatiaCbs)}, IBS ${pct(fatiaIbs)}` +
      `${fatiaLocal ? `, ${ctx.ativ.tributoLocal} ${pct(fatiaLocal)}` : ''} do DAS`));
    creditoPorReal = (fatiaCbs + fatiaIbs) * efetiva;
    if (locais) {
      linhas.push(...ivaRegular(ctx, { cbs: false, ibs: true }, valorLocal));
      creditoPorReal += ibs * (1 - red);
    }
  } else {
    const fora = fatiaCbs + fatiaIbs;
    linhas.push(linha('DAS reduzido', 'DAS', das * (1 - fora),
      `${cabecalho}. Sem as fatias de CBS e IBS (${pct(fora)} do DAS), que passam a ser apuradas por fora`));
    linhas.push(...ivaRegular(ctx, { cbs: true, ibs: true }, valorLocal));
    creditoPorReal = (cbs + ibs) * (1 - red);
  }

  if (locais) linhas.push(...locais);
  if (anexo === 'IV') linhas.push(cpp(ctx, LIMITES.cppAnexoIV, 'no Anexo IV o INSS patronal é pago fora do DAS'));

  return fechar(regime, ctx, linhas, creditoPorReal);
}

export const simplesUnificado = (ctx: Contexto) => simples(ctx, false);
export const simplesHibrido = (ctx: Contexto) => simples(ctx, true);

// ---------------------------------------------------------------------------
// Lucro Presumido e Lucro Real: IBS/CBS, ICMS/ISS e INSS iguais; muda só IRPJ/CSLL
// ---------------------------------------------------------------------------

function tributosConsumoEFolha(ctx: Contexto): Linha[] {
  const locais = tributosLocais(ctx, false);
  return [
    ...ivaRegular(ctx, { cbs: true, ibs: true }, locais.reduce((t, l) => t + l.valor, 0)),
    ...locais,
    cpp(ctx, LIMITES.cppRegular, '20% INSS + 2% RAT + 5,8% terceiros'),
  ];
}

function creditoRegular(ctx: Contexto) {
  const { cbs, ibs } = aliquotasIva(ctx);
  return (cbs + ibs) * (1 - ctx.ativ.reducaoIbsCbs);
}

export function lucroPresumido(ctx: Contexto): ResultadoRegime {
  if (ctx.rbt12 > LIMITES.presumidoTeto) return inelegivel('PRESUMIDO', ctx, 'Faturamento acima de R$ 78 milhões por ano');
  // LC 224/2025: presunção 10% maior sobre a parcela da receita acima de R$ 5 mi/ano
  const excedente = Math.max(0, ctx.fat - LIMITES.presumidoMajoracaoAcima / 12);
  const base = (p: number) => ctx.fat * p + excedente * p * LIMITES.presumidoMajoracao;
  const linhas = [
    ...irpjCsll(base(ctx.ativ.presuncaoIrpj), base(ctx.ativ.presuncaoCsll),
      `Presunção de ${pct(ctx.ativ.presuncaoIrpj, 0)} (IRPJ) e ${pct(ctx.ativ.presuncaoCsll, 0)} (CSLL)` +
      (excedente ? ', com acréscimo de 10% da LC 224/2025 sobre a receita acima de R$ 5 mi/ano' : '')),
    ...tributosConsumoEFolha(ctx),
  ];
  return fechar('PRESUMIDO', ctx, linhas, creditoRegular(ctx));
}

export function lucroReal(ctx: Contexto): ResultadoRegime {
  const lucro = Math.max(0, ctx.fat * ctx.e.margemLucro);
  const linhas = [
    ...irpjCsll(lucro, lucro, `Lucro estimado com margem de ${pct(ctx.e.margemLucro, 1)}`),
    ...tributosConsumoEFolha(ctx),
  ];
  return fechar('REAL', ctx, linhas, creditoRegular(ctx));
}

export const CALCULADORAS: Record<Regime, (ctx: Contexto) => ResultadoRegime> = {
  SN_UNIFICADO: simplesUnificado,
  SN_HIBRIDO: simplesHibrido,
  PRESUMIDO: lucroPresumido,
  REAL: lucroReal,
};
