import { ATIVIDADES, LIMITES, NOMES_REGIME, enquadramento, type Entrada, type Resultado } from '../motor';
import type { Severidade } from './campos';
import { pct } from './formato';

export interface Mensagem { tipo: Severidade; titulo: string; texto: string }

/** Erros impedem a análise; avisos só alertam. */
export function validar(e: Entrada): { erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  if (e.faturamentoMensal <= 0) erros.push('Informe o faturamento mensal.');
  if (e.comprasMensais > e.faturamentoMensal && e.faturamentoMensal > 0) avisos.push('As compras estão maiores que o faturamento.');
  if (e.folhaMensal > e.faturamentoMensal && e.faturamentoMensal > 0) avisos.push('A folha está maior que o faturamento.');
  if (e.margemLucro > 0.6) avisos.push('Margem acima de 60% é incomum. Confira o valor.');
  if (e.avancado.aliqCbs + e.avancado.aliqIbs > 0.4) avisos.push('IBS + CBS acima de 40% foge das estimativas oficiais.');
  return { erros, avisos };
}

/** Pontos de atenção da análise, em ordem de gravidade. */
export function pontosDeAtencao(e: Entrada, r: Resultado): Mensagem[] {
  const m: Mensagem[] = [];
  const enq = enquadramento(e, 2027);
  const ativ = ATIVIDADES[e.atividade];
  const atual = r.anos[0].regimes[e.regimeAtual];

  if (!atual.elegivel) {
    m.push({ tipo: 'critico', titulo: 'Regime atual indisponível', texto: atual.motivo ?? '' });
  }
  if (e.regimeAtual.startsWith('SN_')) {
    m.push({
      tipo: 'atencao', titulo: 'Prazo de opção até 30/10/2026',
      texto: 'A escolha entre Simples Unificado e Híbrido vale para o 1º semestre de 2027 (Res. CGSN 186/2026 e 194/2026). Depois, a próxima janela é em 2027.',
    });
  }
  for (const v of r.viradas) {
    m.push({
      tipo: 'atencao', titulo: `Ponto de virada em ${v.ano}`,
      texto: `O ${NOMES_REGIME[v.para].nome} passa a ter carga menor que o ${NOMES_REGIME[v.de].nome}. Reavalie o regime antes desse ano.`,
    });
  }
  if (enq.simplesElegivel && enq.rbt12 > LIMITES.simplesSublimite * 0.9 && !enq.acimaSublimite) {
    m.push({ tipo: 'atencao', titulo: 'Perto do sublimite de R$ 3,6 milhões', texto: 'Acima dele, ICMS/ISS saem do DAS e passam a ser pagos à parte.' });
  }
  if (enq.acimaSublimite && enq.simplesElegivel) {
    m.push({ tipo: 'info', titulo: 'Acima do sublimite', texto: 'No Simples, ICMS/ISS e IBS foram calculados fora do DAS.' });
  }
  if (enq.fatorR !== null && Math.abs(enq.fatorR - LIMITES.fatorR) < 0.03) {
    m.push({
      tipo: 'atencao', titulo: `Fator R de ${pct(enq.fatorR, 1)}, perto do limite de 28%`,
      texto: 'Uma pequena mudança na folha troca o anexo do Simples (III ou V) e muda bastante o DAS.',
    });
  }
  if (enq.majoracaoPresumido) {
    m.push({
      tipo: 'atencao', titulo: 'Acréscimo da LC 224/2025 no Presumido',
      texto: 'Incluímos a presunção 10% maior sobre a receita acima de R$ 5 milhões. A regra é questionada no STF (ADI 7.920).',
    });
  }
  if (ativ.creditoVedado) {
    m.push({ tipo: 'info', titulo: 'Clientes não tomam crédito', texto: 'Em bares e restaurantes, quem compra não aproveita crédito de IBS/CBS (LC 214, art. 276).' });
  }
  if (r.anos[0].menor === 'REAL') {
    m.push({ tipo: 'info', titulo: 'Lucro Real depende da margem', texto: `O resultado usa margem de ${pct(e.margemLucro, 1)}. Confirme com o balanço antes de decidir.` });
  }
  return m;
}
