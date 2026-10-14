import { useMemo } from 'react';
import {
  ATIVIDADES, NOMES_REGIME, NOMES_UF, REGIMES, VERSAO_PARAMETROS, ajustePreco, avaliarBeneficios, calcularIcms, rankingDestinos,
  simular, type Entrada, type Regime,
} from '../motor';
import { Icone, Painel } from './campos';
import { pontosDeAtencao, validar } from './diagnostico';
import { icmsDaEmpresa, type FiltroBeneficios, type OperacaoIcms } from './estado';
import { brl, pct } from './formato';
import { calcularContrato, regimeDoContrato, variacao, type Contrato } from './ModuloPreco';

type Destino = 'regimes' | 'st-difal' | 'beneficios' | 'preco';

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Itens para revisar com o contador (resumo de docs/REVISAO-CONTADOR.md). */
const A_VALIDAR = [
  'Alíquotas de referência de IBS e CBS: estimativa do Comitê Gestor até o Senado fixar a CBS (prazo: 15/12/2026)',
  'Partilha do DAS de 2027 em diante conforme os Anexos XVIII a XXII da LC 214/2025',
  'Margem de lucro usada no Lucro Real e presunções do Presumido, inclusive o acréscimo da LC 224/2025',
  'DIFAL: método de cálculo (base dupla ou única) no estado de destino e dispensa para o Simples',
  'Existência de ST para o produto (NCM/CEST) entre os estados e a MVA aplicável',
  'Elegibilidade, percentuais e contrapartidas de cada benefício fiscal no termo de concessão',
  'Reajuste de preço: carga de hoje (PIS/COFINS) e premissa de custos fixos',
];

export function ModuloRelatorio({ empresa, op, filtro, contrato, onIr, podeImprimir }: {
  empresa: Entrada; op: OperacaoIcms; filtro: FiltroBeneficios; contrato: Contrato; onIr: (m: Destino) => void; podeImprimir: boolean;
}) {
  const valido = validar(empresa).erros.length === 0;
  const resultado = useMemo(() => (valido ? simular(empresa) : null), [empresa, valido]);
  const icms = icmsDaEmpresa(empresa, op);
  const chave = JSON.stringify(icms);
  const opDestino = useMemo(() => calcularIcms(icms), [chave]);
  // Para escolher destino, a venda interna não conta
  const ranking = useMemo(() => rankingDestinos(icms).filter((x) => x.uf !== icms.ufOrigem), [chave]);
  const beneficios = useMemo(() => avaliarBeneficios({
    perfis: filtro.perfis, volume: op.valor, ufOrigem: icms.ufOrigem, ufDestino: op.ufDestino,
    vendedorSimples: icms.vendedorSimples, importado: op.importado,
  }).filter((a) => a.aderente), [filtro.perfis, chave]);
  // Reajuste de preço: regime de hoje, o de menor carga em 2027 e o escolhido no módulo de preço
  const precos = useMemo(() => {
    if (!resultado) return null;
    const a = resultado.anos[0];
    const elegiveis = REGIMES.filter((r) => a.regimes[r].elegivel);
    const hoje: Regime = empresa.regimeAtual === 'SN_HIBRIDO' ? 'SN_UNIFICADO' : empresa.regimeAtual;
    const doContrato = regimeDoContrato(empresa, contrato, elegiveis);
    const lista = [hoje, a.menor, doContrato].filter((r, i, l) => elegiveis.includes(r) && l.indexOf(r) === i);
    const ajustes = lista.map((r) => ajustePreco(empresa, r));
    const doC = ajustes.find((x) => x.regime === doContrato);
    return { hoje, ajustes, contrato: doC ? { regime: doContrato, ...calcularContrato(contrato, doC.anos) } : null };
  }, [empresa, contrato, resultado]);

  if (!resultado) {
    return (
      <div className="etapa">
        <div className="etapa-titulo"><p className="sobretitulo">Relatório</p><h1>Análise tributária completa</h1></div>
        <section className="painel vazio-rel"><p>Preencha os dados da empresa para gerar o relatório.</p>
          <button type="button" className="botao primario" onClick={() => onIr('regimes')}>Preencher dados</button></section>
      </div>
    );
  }

  const a27 = resultado.anos[0], a33 = resultado.anos[6];
  const atual = a27.regimes[empresa.regimeAtual];
  const economia7 = resultado.totalParado - resultado.totalMelhor;
  const ativ = ATIVIDADES[empresa.atividade];
  const comEconomia = beneficios.filter((b) => b.economia !== null && b.economia > 0).slice(0, 3);
  const atencao = pontosDeAtencao(empresa, resultado).filter((m) => m.tipo !== 'info').slice(0, 4);
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="etapa relatorio">
      <div className="etapa-titulo com-acoes">
        <div>
          <p className="sobretitulo">Relatório · análise tributária completa</p>
          <h1>{empresa.nomeEmpresa?.trim() || 'Sua empresa'}</h1>
          <ul className="contexto">
            <li>{ativ.nome}</li>
            <li>{NOMES_UF[empresa.uf]}</li>
            <li>{brl(empresa.faturamentoMensal)}/mês</li>
            <li>Hoje: {NOMES_REGIME[empresa.regimeAtual].nome.replace('Simples Unificado', 'Simples Nacional')}</li>
            <li>Emitido em {hoje}</li>
          </ul>
        </div>
        {podeImprimir && <div className="acoes"><button type="button" className="botao primario" onClick={() => window.print()}>Imprimir ou salvar PDF</button></div>}
      </div>

      {/* Síntese */}
      <section className="sintese" aria-label="Síntese">
        <div className="sintese-item">
          <span className="sintese-num">1</span>
          <div>
            <span className="kpi-rotulo">Regime</span>
            <b>{maiuscula(resultado.recomendacao.titulo.replace('Em 2027: ', ''))}</b>
            <span>{economia7 > 1 ? `Economia de ${brl(economia7)} de 2027 a 2033` : `${brl(atual.carga)}/mês em 2027 · ${pct(atual.cargaEfetiva, 1)} do faturamento`}</span>
          </div>
        </div>
        <div className="sintese-item">
          <span className="sintese-num">2</span>
          <div>
            <span className="kpi-rotulo">ICMS interestadual</span>
            <b>{icms.ufOrigem} → {op.ufDestino}: {pct(opDestino.carga, 1)} da venda</b>
            <span>Menor carga fora do estado: {NOMES_UF[ranking[0].uf]} ({pct(ranking[0].carga, 1)})</span>
          </div>
        </div>
        <div className="sintese-item">
          <span className="sintese-num">3</span>
          <div>
            <span className="kpi-rotulo">Benefícios fiscais</span>
            <b>{comEconomia.length ? `Até ${brl(comEconomia[0].economia!)}/mês com ${comEconomia[0].b.nome.split(' · ')[0]} (${comEconomia[0].b.uf})` : beneficios.length ? `${beneficios.length} benefício(s) a avaliar` : 'Nenhum para o perfil informado'}</b>
            <span>{icms.vendedorSimples ? 'Exigem sair do Simples' : 'Dependem de estabelecimento no estado'}</span>
          </div>
        </div>
      </section>

      <Painel titulo="1. Regime tributário na Reforma" subtitulo={resultado.recomendacao.titulo}
        acao={<button type="button" className="botao fantasma pequeno" onClick={() => onIr('regimes')}>Ver análise completa</button>}>
        <ul className="lista-texto">{resultado.recomendacao.texto.map((t) => <li key={t}>{t}</li>)}</ul>
        <div className="tabela-rolagem">
          <table className="tabela compacta">
            <thead><tr><th>Regime</th><th className="num">2027 (R$/mês)</th><th className="num">2033 (R$/mês)</th><th className="num">Total 2027–2033</th></tr></thead>
            <tbody>
              {REGIMES.map((r) => {
                const total = resultado.anos.reduce((s, a) => s + (a.regimes[r].elegivel ? a.regimes[r].carga * 12 : NaN), 0);
                return (
                  <tr key={r} className={r === empresa.regimeAtual ? 'linha-atual' : ''}>
                    <th scope="row"><i className={`ponto c-${r}`} />{NOMES_REGIME[r].nome}{r === empresa.regimeAtual && <span className="tag">atual</span>}</th>
                    <td className={`num ${a27.menor === r ? 'min' : ''}`}>{a27.regimes[r].elegivel ? brl(a27.regimes[r].carga) : '—'}</td>
                    <td className={`num ${a33.menor === r ? 'min' : ''}`}>{a33.regimes[r].elegivel ? brl(a33.regimes[r].carga) : '—'}</td>
                    <td className="num">{Number.isFinite(total) ? brl(total) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {REGIMES.some((r) => !a27.regimes[r].elegivel) && (
          <p className="nota">— Indisponível: {REGIMES.filter((r) => !a27.regimes[r].elegivel).map((r) => a27.regimes[r].motivo).filter((v, i, l) => l.indexOf(v) === i).join('; ')}.</p>
        )}
      </Painel>

      {precos && precos.ajustes.length > 0 && (
        <Painel titulo="2. Preço para manter o lucro" subtitulo="Quanto o preço muda, por ano, em relação a hoje"
          acao={<button type="button" className="botao fantasma pequeno" onClick={() => onIr('preco')}>Ver detalhes</button>}>
          <div className="tabela-rolagem">
            <table className="tabela compacta">
              <thead><tr><th>Regime</th>{resultado.anos.map((a) => <th key={a.ano} className="num">{a.ano}</th>)}</tr></thead>
              <tbody>
                {precos.ajustes.map((x) => (
                  <tr key={x.regime}>
                    <th scope="row"><i className={`ponto c-${x.regime}`} />{NOMES_REGIME[x.regime].nome}{x.regime === precos.hoje && <span className="tag">hoje</span>}</th>
                    {x.anos.map((a) => (
                      <td key={a.ano} className={`num ${a.fator !== null && a.fator > 1.0005 ? 'pior' : a.fator !== null && a.fator < 0.9995 ? 'melhor' : ''}`}>
                        {a.fator === null ? '—' : Math.abs(a.fator - 1) < 0.0005 ? 'igual' : variacao(a.fator)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {precos.contrato && Number.isFinite(precos.contrato.ajustado) && (
            <p className="nota">
              Contrato de {brl(contrato.valor)}/mês de {contrato.inicio} a {contrato.fim} no {NOMES_REGIME[precos.contrato.regime].nome}:
              {' '}{brl(precos.contrato.original)} hoje, {brl(precos.contrato.ajustado)} corrigido ({brl(precos.contrato.ajustado - precos.contrato.original)}).
            </p>
          )}
        </Painel>
      )}

      <div className="grade-analise igual">
        <Painel titulo="3. ICMS nas vendas para outros estados" subtitulo={`Venda de ${brl(op.valor)} de ${icms.ufOrigem} para ${NOMES_UF[op.ufDestino]}`}
          acao={<button type="button" className="botao fantasma pequeno" onClick={() => onIr('st-difal')}>Ver mapa</button>}>
          <dl className="enq-lista">
            <div><dt>ICMS total na operação</dt><dd>{brl(opDestino.total)} · {pct(opDestino.carga, 1)}</dd></div>
            <div><dt>Recolhido por você</dt><dd>{brl(opDestino.pagoVendedor)}</dd></div>
            <div><dt>DIFAL</dt><dd>{brl(opDestino.difal)}</dd></div>
            <div><dt>ICMS-ST</dt><dd>{brl(opDestino.st)}</dd></div>
          </dl>
          <p className="kpi-rotulo">Outros estados com menor carga</p>
          <ol className="ranking-lista compacta">
            {ranking.slice(0, 3).map((x, i) => (
              <li key={x.uf}><span className="pos">{i + 1}</span><span className="nome">{NOMES_UF[x.uf]}</span><span className="num">{pct(x.carga, 1)}</span></li>
            ))}
          </ol>
        </Painel>

        <Painel titulo="4. Benefícios fiscais" subtitulo="Para o perfil marcado no buscador"
          acao={<button type="button" className="botao fantasma pequeno" onClick={() => onIr('beneficios')}>Ver todos</button>}>
          {beneficios.length === 0 ? <p className="nota">Nenhum benefício para o perfil informado.</p> : (
            <ul className="lista-beneficios">
              {beneficios.slice(0, 4).map((a) => (
                <li key={a.b.id}>
                  <span className="uf-tag">{a.b.uf}</span>
                  <div><b>{a.b.nome}</b><span>{a.economia !== null ? `Economia estimada de ${brl(a.economia)}/mês` : a.b.cargaTexto}</span></div>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      <div className="grade-analise igual">
        <Painel titulo="5. Pontos de atenção">
          {atencao.length === 0 ? <p className="nota">Nenhum alerta específico.</p> : (
            <ul className="atencao">
              {atencao.map((m) => <li key={m.titulo} className={`sev-${m.tipo}`}><Icone tipo={m.tipo} /><div><b>{m.titulo}</b><p>{m.texto}</p></div></li>)}
            </ul>
          )}
        </Painel>
        <Painel titulo="6. Para validar com o contador">
          <ul className="checklist">{A_VALIDAR.map((t) => <li key={t}><span className="caixa" aria-hidden="true" />{t}</li>)}</ul>
        </Painel>
      </div>

      <p className="nota aviso">
        Estimativas com base na LC 214/2025, na legislação estadual de ICMS e nas premissas informadas, com parâmetros de {VERSAO_PARAMETROS.split('-').reverse().join('/')}.
        Não substituem a análise de um contador, nem garantem economia.
      </p>
    </div>
  );
}
