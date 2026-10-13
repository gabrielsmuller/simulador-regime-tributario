import { NOMES_REGIME } from './parametros';
import { CALCULADORAS, criarContexto } from './regimes';
import { ANOS, REGIMES, type Categoria, type Entrada, type Regime, type Resultado, type ResultadoAno, type Virada } from './tipos';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nome = (r: Regime) => NOMES_REGIME[r].nome;

/** Motor determinístico: mesma entrada, mesmo resultado. Sem I/O. */
export function simular(e: Entrada): Resultado {
  const anos: ResultadoAno[] = ANOS.map((ano) => {
    const ctx = criarContexto(e, ano);
    const regimes = Object.fromEntries(REGIMES.map((r) => [r, CALCULADORAS[r](ctx)])) as ResultadoAno['regimes'];

    const atual = regimes[e.regimeAtual];
    for (const r of REGIMES) {
      const res = regimes[r];
      if (res.elegivel && atual.elegivel && atual.carga > 0) res.variacao = res.carga / atual.carga - 1;
    }
    const elegiveis = REGIMES.filter((r) => regimes[r].elegivel);
    // em empate, prefere o regime atual (não vale trocar por centavos)
    const menor = elegiveis.reduce((m, r) =>
      regimes[r].carga < regimes[m].carga - 0.005 ? r : m,
      elegiveis.includes(e.regimeAtual) ? e.regimeAtual : elegiveis[0]);
    return { ano, faturamento: ctx.fat, regimes, menor };
  });

  const viradas: Virada[] = [];
  for (let i = 1; i < anos.length; i++) {
    if (anos[i].menor !== anos[i - 1].menor) viradas.push({ ano: anos[i].ano, de: anos[i - 1].menor, para: anos[i].menor });
  }

  const totalParado = anos.reduce((s, a) => s + (a.regimes[e.regimeAtual].elegivel ? a.regimes[e.regimeAtual].carga * 12 : NaN), 0);
  const totalMelhor = anos.reduce((s, a) => s + a.regimes[a.menor].carga * 12, 0);

  return { anos, viradas, totalParado, totalMelhor, recomendacao: recomendar(e, anos, viradas) };
}

function recomendar(e: Entrada, anos: ResultadoAno[], viradas: Virada[]) {
  const a27 = anos[0];
  const atual = a27.regimes[e.regimeAtual];
  const texto: string[] = [];
  let titulo: string;

  if (!atual.elegivel) {
    titulo = `Em 2027: seu regime atual não estará disponível. O ${nome(a27.menor)} tem a menor carga.`;
    texto.push(atual.motivo ?? '');
  } else if (a27.menor === e.regimeAtual) {
    titulo = `Em 2027: permaneça no ${nome(e.regimeAtual)}`;
    const segundo = segundaOpcao(a27, e.regimeAtual);
    if (segundo) texto.push(motivo(a27, e.regimeAtual, segundo));
    if (viradas.length === 0) texto.push('Segue como a opção de menor carga em todos os anos até 2033.');
  } else {
    titulo = `Em 2027: avalie mudar para o ${nome(a27.menor)}`;
    texto.push(motivo(a27, a27.menor, e.regimeAtual));
  }

  for (const v of viradas) {
    texto.push(`A partir de ${v.ano}, o ${nome(v.para)} passa a ter carga menor que o ${nome(v.de)}.`);
  }

  const un = a27.regimes.SN_UNIFICADO, hi = a27.regimes.SN_HIBRIDO;
  if (un.elegivel && hi.elegivel && e.percVendasEmpresas >= 0.3 && a27.menor === 'SN_UNIFICADO' && hi.creditoPorReal > 0) {
    const diff = hi.carga - un.carga;
    const ganhoCliente = hi.creditoClientesMes - un.creditoClientesMes;
    texto.push(
      `Como ${Math.round(e.percVendasEmpresas * 100)}% das suas vendas são para empresas, vale pesar o Simples Híbrido: ` +
      `ele custa ${brl(diff)}/mês a mais, mas seus clientes passam a aproveitar ${brl(ganhoCliente)}/mês a mais de crédito, ` +
      `o que pode deixar seu preço mais competitivo.`);
  }
  return { titulo, texto };
}

const NOME_CATEGORIA: Record<Categoria, string> = {
  DAS: 'no DAS', CBS: 'na CBS', IBS: 'no IBS', LOCAL: 'no ICMS/ISS', RENDA: 'no IRPJ/CSLL', INSS: 'no INSS patronal',
};

/** Explica de onde vem a vantagem do `vencedor` sobre o `outro`: a categoria com maior diferença. */
function motivo(a: ResultadoAno, vencedor: Regime, outro: Regime): string {
  const soma = (r: Regime) => {
    const s: Record<Categoria, number> = { DAS: 0, CBS: 0, IBS: 0, LOCAL: 0, RENDA: 0, INSS: 0 };
    for (const l of a.regimes[r].linhas) s[l.categoria] += l.valor;
    return s;
  };
  const v = soma(vencedor), o = soma(outro);
  // No Simples, o DAS substitui vários tributos: compara o DAS com o que ele cobre no outro regime.
  const simples = (r: Regime) => r === 'SN_UNIFICADO' || r === 'SN_HIBRIDO';
  if (simples(vencedor) && simples(outro)) {
    const [un, hi] = vencedor === 'SN_UNIFICADO' ? [v, o] : [o, v];
    const ivaFora = hi.CBS + hi.IBS;
    return `No Híbrido, o DAS cai ${brl(un.DAS - hi.DAS)}/mês, mas a CBS e o IBS por fora somam ${brl(ivaFora)}/mês` +
      (vencedor === 'SN_UNIFICADO' ? '. Por isso o Unificado sai mais barato.' : ', já descontados os créditos das compras.');
  }
  if (simples(vencedor) !== simples(outro)) {
    const [s, n] = simples(vencedor) ? [v, o] : [o, v];
    const fora = n.RENDA + n.INSS + n.CBS + n.IBS + n.LOCAL - (s.CBS + s.IBS + s.LOCAL + s.INSS);
    return simples(vencedor)
      ? `O DAS de ${brl(s.DAS)}/mês reúne tributos que, no ${nome(outro)}, somariam ${brl(fora)}/mês.`
      : `No ${nome(vencedor)}, os tributos somam ${brl(fora)}/mês, contra um DAS de ${brl(s.DAS)}/mês no ${nome(outro)}.`;
  }
  const cat = (Object.keys(v) as Categoria[]).sort((x, y) => (o[y] - v[y]) - (o[x] - v[x]))[0];
  return `A maior diferença está ${NOME_CATEGORIA[cat]}: ` +
    `${brl(v[cat])}/mês no ${nome(vencedor)}, contra ${brl(o[cat])}/mês no ${nome(outro)}.`;
}

/** Regime elegível de menor carga depois do informado. */
export function segundaOpcao(a: ResultadoAno, excluir: Regime): Regime | null {
  const resto = REGIMES.filter((r) => r !== excluir && a.regimes[r].elegivel)
    .sort((x, y) => a.regimes[x].carga - a.regimes[y].carga);
  return resto[0] ?? null;
}
