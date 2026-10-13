import { useState } from 'react';
import { ANOS, ATIVIDADES, FONTES, NOMES_REGIME, REGIMES, aliquotasIva, criarContexto, segundaOpcao, type Ano, type Entrada, type Regime, type Resultado } from '../motor';
import { Icone, Painel, Segmentado } from './campos';
import { pontosDeAtencao } from './diagnostico';
import { brl, pct } from './formato';
import { Composicao, GraficoEvolucao } from './graficos';

type Visao = 'mensal' | 'anual' | 'efetiva';

export function EtapaAnalise({ entrada, resultado, onEditar, podeImprimir }: {
  entrada: Entrada; resultado: Resultado; onEditar: () => void; podeImprimir: boolean;
}) {
  const [ano, setAno] = useState<Ano>(2027);
  const [regimeSel, setRegimeSel] = useState<Regime>(entrada.regimeAtual);
  const [visao, setVisao] = useState<Visao>('mensal');
  const dados = resultado.anos.find((a) => a.ano === ano)!;
  const a27 = resultado.anos[0];
  const atual27 = a27.regimes[entrada.regimeAtual];
  const melhor27 = a27.regimes[a27.menor];
  const economiaMes = atual27.elegivel ? atual27.carga - melhor27.carga : NaN;
  const economia7 = resultado.totalParado - resultado.totalMelhor;
  const mudar = atual27.elegivel && economiaMes > 0.5;
  const segundo = segundaOpcao(a27, entrada.regimeAtual);
  const ativ = ATIVIDADES[entrada.atividade];
  const atencao = pontosDeAtencao(entrada, resultado);
  const maxAno = Math.max(...REGIMES.map((r) => dados.regimes[r].carga), 1);

  return (
    <div className="etapa">
      <div className="etapa-titulo com-acoes">
        <div>
          <p className="sobretitulo">Etapa 2 de 2 · Análise comparativa</p>
          <h1>{entrada.nomeEmpresa?.trim() || 'Sua empresa na Reforma'}</h1>
          <ul className="contexto">
            <li>{ativ.nome}</li>
            <li>{entrada.uf}</li>
            <li>{brl(entrada.faturamentoMensal)}/mês</li>
            <li>Hoje: {NOMES_REGIME[entrada.regimeAtual].nome.replace('Simples Unificado', 'Simples Nacional')}</li>
          </ul>
        </div>
        <div className="acoes">
          <button type="button" className="botao secundario" onClick={onEditar}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 8H3M7 4 3 8l4 4" /></svg>
            Editar dados
          </button>
          {podeImprimir && <button type="button" className="botao secundario" onClick={() => window.print()}>Imprimir relatório</button>}
        </div>
      </div>

      {/* Resumo executivo */}
      <section className="resumo" aria-labelledby="t-rec">
        <div className="recomendacao">
          <p className="sobretitulo">Recomendação para 2027</p>
          <h2 id="t-rec">{resultado.recomendacao.titulo}</h2>
          <ul>{resultado.recomendacao.texto.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="kpis">
          <div className="kpi">
            <span className="kpi-rotulo">Imposto no regime atual</span>
            <span className="kpi-valor">{atual27.elegivel ? brl(atual27.carga) : '—'}<small>/mês</small></span>
            <span className="kpi-nota">{atual27.elegivel ? `${pct(atual27.cargaEfetiva, 1)} do faturamento em 2027` : 'Indisponível em 2027'}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">Menor carga em 2027</span>
            <span className="kpi-valor texto"><i className={`ponto c-${a27.menor}`} />{NOMES_REGIME[a27.menor].nome}</span>
            <span className="kpi-nota">{brl(melhor27.carga)}/mês · {pct(melhor27.cargaEfetiva, 1)} do faturamento</span>
          </div>
          {mudar ? (
            <div className="kpi">
              <span className="kpi-rotulo">Economia possível em 2027</span>
              <span className="kpi-valor bom">{brl(economiaMes)}<small>/mês</small></span>
              <span className="kpi-nota">{brl(economiaMes * 12)} no ano, trocando para o {NOMES_REGIME[a27.menor].nome}</span>
            </div>
          ) : (
            <div className="kpi">
              <span className="kpi-rotulo">Vantagem sobre a 2ª opção</span>
              <span className="kpi-valor bom">{segundo ? brl(a27.regimes[segundo].carga - atual27.carga) : '—'}<small>/mês</small></span>
              <span className="kpi-nota">{segundo ? `Mais barato que o ${NOMES_REGIME[segundo].nome}` : 'Único regime disponível'}</span>
            </div>
          )}
          {economia7 > 1 ? (
            <div className="kpi">
              <span className="kpi-rotulo">Economia acumulada 2027–2033</span>
              <span className="kpi-valor bom">{brl(economia7)}</span>
              <span className="kpi-nota">
                Escolhendo o menor regime a cada ano{resultado.viradas.length ? ` · virada em ${resultado.viradas.map((v) => v.ano).join(', ')}` : ''}
              </span>
            </div>
          ) : (
            <div className="kpi">
              <span className="kpi-rotulo">Impostos de 2027 a 2033</span>
              <span className="kpi-valor">{Number.isFinite(resultado.totalParado) ? brl(resultado.totalParado) : '—'}</span>
              <span className="kpi-nota">No regime atual, o menor custo possível no período</span>
            </div>
          )}
        </div>
      </section>

      {/* Comparativo por ano */}
      <Painel titulo="Os 4 regimes lado a lado" subtitulo="Carga mensal estimada no ano selecionado"
        acao={<Segmentado rotulo="Ano" valor={ano} onChange={setAno} opcoes={ANOS.map((a) => ({ valor: a, rotulo: String(a) }))} />}>
        <div className="regimes">
          {REGIMES.map((r) => {
            const res = dados.regimes[r];
            const atual = r === entrada.regimeAtual;
            const menor = r === dados.menor;
            return (
              <button key={r} type="button" onClick={() => res.elegivel && setRegimeSel(r)}
                className={`regime c-${r} ${menor ? 'menor' : ''} ${!res.elegivel ? 'off' : ''} ${r === regimeSel ? 'sel' : ''}`}>
                <span className="regime-topo">
                  <i className={`ponto c-${r}`} />
                  <span className="regime-nome">{NOMES_REGIME[r].nome}</span>
                </span>
                <span className="regime-sub">{NOMES_REGIME[r].sub}</span>
                <span className="selos">
                  {atual && <span className="selo">Regime atual</span>}
                  {menor && <span className="selo bom"><Icone tipo="ok" />Menor carga</span>}
                </span>
                {res.elegivel ? (
                  <>
                    <span className="regime-valor">{brl(res.carga)}<small>/mês</small></span>
                    <span className="regime-barra"><span style={{ width: `${(res.carga / maxAno) * 100}%` }} /></span>
                    <span className="regime-rodape">
                      <span>{pct(res.cargaEfetiva, 1)} do faturamento</span>
                      {atual ? <span className="delta">base</span>
                        : res.variacao === null ? null
                        : <span className={`delta ${res.variacao > 0.0005 ? 'pior' : res.variacao < -0.0005 ? 'melhor' : ''}`}>
                            {res.variacao > 0 ? '+' : '−'}{pct(Math.abs(res.variacao), 1)}
                          </span>}
                    </span>
                  </>
                ) : <span className="regime-motivo">{res.motivo}</span>}
              </button>
            );
          })}
        </div>
      </Painel>

      <div className="grade-analise">
        <Painel titulo="Evolução da carga mensal" subtitulo="2027 a 2033 · clique em um ano para selecioná-lo">
          <GraficoEvolucao resultado={resultado} ano={ano} onAno={setAno} regimeAtual={entrada.regimeAtual} />
        </Painel>
        <Painel titulo={`Composição da carga em ${ano}`} subtitulo="Por tributo, em R$ por mês">
          <Composicao dados={dados} regimeSel={regimeSel} onRegime={setRegimeSel} />
        </Painel>
      </div>

      {/* Tabela anual */}
      <Painel titulo="Tabela ano a ano" subtitulo="Menor valor de cada ano em destaque"
        acao={<Segmentado rotulo="Visão da tabela" valor={visao} onChange={setVisao}
          opcoes={[{ valor: 'mensal', rotulo: 'R$/mês' }, { valor: 'anual', rotulo: 'R$/ano' }, { valor: 'efetiva', rotulo: '% do faturamento' }]} />}>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Regime</th>
                {resultado.anos.map((a) => <th key={a.ano} scope="col" className={`num ${a.ano === ano ? 'col-sel' : ''}`}>{a.ano}</th>)}
                {visao !== 'efetiva' && <th scope="col" className="num total">Total 7 anos</th>}
              </tr>
            </thead>
            <tbody>
              {REGIMES.map((r) => {
                const total = resultado.anos.reduce((s, a) => s + (a.regimes[r].elegivel ? a.regimes[r].carga * 12 : NaN), 0);
                return (
                  <tr key={r} className={r === entrada.regimeAtual ? 'linha-atual' : ''}>
                    <th scope="row"><i className={`ponto c-${r}`} />{NOMES_REGIME[r].nome}{r === entrada.regimeAtual && <span className="tag">atual</span>}</th>
                    {resultado.anos.map((a) => {
                      const res = a.regimes[r];
                      const v = visao === 'mensal' ? brl(res.carga) : visao === 'anual' ? brl(res.carga * 12) : pct(res.cargaEfetiva, 1);
                      return <td key={a.ano} className={`num ${a.menor === r ? 'min' : ''} ${a.ano === ano ? 'col-sel' : ''}`}>{res.elegivel ? v : '—'}</td>;
                    })}
                    {visao !== 'efetiva' && <td className="num total">{Number.isFinite(total) ? brl(total) : '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>

      <div className="grade-analise igual">
        <Painel titulo="Crédito para clientes empresa" subtitulo={`Quanto quem compra de você desconta de IBS/CBS · ${ano}`}>
          <div className="tabela-rolagem"><table className="tabela compacta">
            <thead><tr><th>Regime</th><th className="num">A cada R$ 100 vendidos</th><th className="num">Por mês ({pct(entrada.percVendasEmpresas, 0)} B2B)</th></tr></thead>
            <tbody>
              {REGIMES.map((r) => {
                const res = dados.regimes[r];
                return (
                  <tr key={r}>
                    <th scope="row"><i className={`ponto c-${r}`} />{NOMES_REGIME[r].nome}</th>
                    <td className="num">{res.elegivel ? brl(res.creditoPorReal * 100) : '—'}</td>
                    <td className="num">{res.elegivel ? brl(res.creditoClientesMes) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <p className="nota">
            {ativ.creditoVedado
              ? 'Bares e restaurantes não transferem crédito ao cliente (LC 214, art. 276).'
              : 'No Unificado, o crédito se limita à parte de IBS/CBS paga dentro do DAS. Nos demais, o cliente aproveita a alíquota cheia.'}
          </p>
        </Painel>
        <Painel titulo="Pontos de atenção" subtitulo={atencao.length ? `${atencao.length} ${atencao.length > 1 ? 'itens' : 'item'} para revisar com seu contador` : 'Nada fora do comum para esta empresa'}>
          {atencao.length === 0 && <p className="nota">Nenhum alerta específico. Revise as premissas abaixo com seu contador.</p>}
          <ul className="atencao">
            {atencao.map((m) => (
              <li key={m.titulo} className={`sev-${m.tipo}`}>
                <Icone tipo={m.tipo} />
                <div><b>{m.titulo}</b><p>{m.texto}</p></div>
              </li>
            ))}
          </ul>
        </Painel>
      </div>

      <Memoria entrada={entrada} resultado={resultado} ano={ano} regime={regimeSel} onRegime={setRegimeSel} onAno={setAno} />

      <Painel titulo="Premissas e base legal" subtitulo="Parâmetros usados nesta análise" className="premissas">
        <div className="grade-premissas">
          <div className="tabela-rolagem"><table className="tabela compacta">
            <tbody>
              <tr><th scope="row">CBS / IBS (alíquota cheia)</th><td className="num">{pct(entrada.avancado.aliqCbs)} / {pct(entrada.avancado.aliqIbs)}</td></tr>
              <tr><th scope="row">CBS / IBS em {ano}</th><td className="num">{(() => { const v = aliquotasIva(criarContexto(entrada, ano)); return `${pct(v.cbs)} / ${pct(v.ibs)}`; })()}</td></tr>
              <tr><th scope="row">ICMS ({entrada.uf}) / ISS</th><td className="num">{pct(entrada.avancado.aliqIcms, 1)} / {pct(entrada.avancado.aliqIss, 1)}</td></tr>
              <tr><th scope="row">Compras de fornecedores fora do Simples</th><td className="num">{pct(entrada.avancado.percFornecedoresRegular, 0)}</td></tr>
              <tr><th scope="row">Margem (Lucro Real)</th><td className="num">{pct(entrada.margemLucro, 1)}</td></tr>
              <tr><th scope="row">Crescimento anual</th><td className="num">{pct(entrada.avancado.crescimentoAnual, 1)}</td></tr>
            </tbody>
          </table></div>
          <div className="tabela-rolagem"><table className="tabela compacta">
            <thead><tr><th>Regra</th><th>Fonte</th></tr></thead>
            <tbody>{FONTES.map((f) => <tr key={f.item}><td>{f.item}</td><td className="fonte">{f.fonte}</td></tr>)}</tbody>
          </table></div>
        </div>
        <p className="nota aviso">
          Estimativa direcional, sem garantia de economia. As alíquotas de IBS e CBS ainda serão fixadas pelo Senado (até 15/12/2026). Fora da conta: FGTS, Imposto Seletivo, substituição tributária,
          benefícios estaduais, regimes específicos e créditos de fornecedores do Simples. Valide a decisão com seu contador.
        </p>
      </Painel>
    </div>
  );
}

function Memoria({ entrada, resultado, ano, regime, onRegime, onAno }: {
  entrada: Entrada; resultado: Resultado; ano: Ano; regime: Regime; onRegime: (r: Regime) => void; onAno: (a: Ano) => void;
}) {
  const res = resultado.anos.find((a) => a.ano === ano)!.regimes[regime];
  return (
    <Painel titulo="Memória de cálculo" subtitulo="Como cada valor foi obtido"
      acao={<select aria-label="Ano da memória" value={ano} onChange={(e) => onAno(Number(e.target.value) as Ano)}>
        {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>}>
      <div className="abas" role="tablist" aria-label="Regime">
        {REGIMES.map((r) => (
          <button key={r} type="button" role="tab" aria-selected={r === regime} className={r === regime ? 'on' : ''} onClick={() => onRegime(r)}>
            <i className={`ponto c-${r}`} />{NOMES_REGIME[r].nome}{r === entrada.regimeAtual && <span className="tag">atual</span>}
          </button>
        ))}
      </div>
      {res.elegivel ? (
        <div className="tabela-rolagem">
          <table className="tabela memoria">
            <thead><tr><th>Tributo</th><th className="num">R$/mês</th><th className="num">% do fat.</th><th>Cálculo</th></tr></thead>
            <tbody>
              {res.linhas.map((l) => (
                <tr key={l.tributo}>
                  <th scope="row"><i className={`quadrado k-${l.categoria}`} />{l.tributo}</th>
                  <td className="num">{brl(l.valor)}</td>
                  <td className="num">{pct(res.cargaEfetiva ? (l.valor / res.carga) * res.cargaEfetiva : 0, 2)}</td>
                  <td className="calculo">{l.memoria}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row">Total</th><td className="num">{brl(res.carga)}</td><td className="num">{pct(res.cargaEfetiva, 2)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      ) : <p className="nota">{res.motivo}</p>}
    </Painel>
  );
}
