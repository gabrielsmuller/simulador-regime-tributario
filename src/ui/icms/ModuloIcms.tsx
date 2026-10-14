import { useEffect, useMemo, useState } from 'react';
import {
  ICMS_INTERNA, FCP_UF, NOMES_UF, UFS, calcularIcms, rankingDestinos, transicaoIcms,
  type EntradaIcms, type QuemPaga, type TipoCliente,
} from '../../motor';
import { Campo, CampoNumero, Icone, Painel, Segmentado } from '../campos';
import { brl, pct } from '../formato';
import { MapaBrasil } from './MapaBrasil';

const CHAVE = 'simulador-reforma:icms:v1';

const PADRAO: EntradaIcms = {
  ufOrigem: 'SP', ufDestino: 'BA', vendedorSimples: false, tipoCliente: 'nao_contribuinte',
  importado: false, temSt: false, mvaOriginal: 0.4, valor: 10_000, metodoDifal: 'dupla', difalNoSimples: false,
};

const CLIENTES: { valor: TipoCliente; rotulo: string; desc: string }[] = [
  { valor: 'nao_contribuinte', rotulo: 'Consumidor final', desc: 'Pessoa física ou empresa sem inscrição estadual (ex.: e-commerce). Gera DIFAL.' },
  { valor: 'revenda', rotulo: 'Empresa que revende', desc: 'Contribuinte do ICMS que vai revender. Pode gerar ST.' },
  { valor: 'uso_consumo', rotulo: 'Empresa para uso próprio', desc: 'Contribuinte que usa ou imobiliza o produto. O DIFAL é do comprador.' },
];

const QUEM: Record<QuemPaga, string> = { vendedor: 'Você', comprador: 'Comprador', das: 'No DAS' };

function carregar(): EntradaIcms {
  try {
    const s = localStorage.getItem(CHAVE);
    if (s) { const e = JSON.parse(s) as EntradaIcms; if (e && e.ufOrigem in ICMS_INTERNA) return { ...PADRAO, ...e }; }
  } catch { /* usa o padrão */ }
  return PADRAO;
}

export function ModuloIcms() {
  const [e, setE] = useState<EntradaIcms>(carregar);
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch { /* ignora */ } }, [e]);
  const set = <K extends keyof EntradaIcms>(k: K, v: EntradaIcms[K]) => setE((x) => ({ ...x, [k]: v }));
  const escolherDestino = (uf: string) => setE((x) => ({ ...x, ufDestino: uf, internaDestino: undefined, fcpDestino: undefined }));

  const r = useMemo(() => calcularIcms(e), [e]);
  const ranking = useMemo(() => rankingDestinos(e), [e]);
  const transicao = useMemo(() => transicaoIcms(e), [e]);
  const posicao = ranking.findIndex((x) => x.uf === e.ufDestino) + 1;
  const melhores = ranking.slice(0, 5);
  const pior = ranking[ranking.length - 1];
  const empate = pior.total - ranking[0].total < 0.01;

  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <p className="sobretitulo">ICMS interestadual</p>
        <h1>ST e DIFAL por estado de destino</h1>
        <p>Veja quanto de ICMS cada venda para outro estado gera, entre alíquota interestadual, DIFAL e substituição tributária, e em qual estado a carga é menor.</p>
      </div>

      <div className="grade-icms">
        <aside className="icms-form">
          <section className="enq-cartao">
            <h2>Dados da operação</h2>
            <Campo id="i-origem" rotulo="Estado de onde você vende">
              <select id="i-origem" value={e.ufOrigem} onChange={(ev) => set('ufOrigem', ev.target.value)}>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf} · {NOMES_UF[uf]}</option>)}
              </select>
            </Campo>
            <div className="campo">
              <span className="rotulo">Regime da sua empresa</span>
              <Segmentado rotulo="Regime da sua empresa" valor={e.vendedorSimples ? 's' : 'n'}
                onChange={(v) => set('vendedorSimples', v === 's')}
                opcoes={[{ valor: 's', rotulo: 'Simples Nacional' }, { valor: 'n', rotulo: 'Presumido ou Real' }]} />
            </div>
            <fieldset className="campo">
              <legend className="rotulo">Para quem você vende</legend>
              <div className="opcoes-lista">
                {CLIENTES.map((c) => (
                  <label key={c.valor} className={`opcao ${e.tipoCliente === c.valor ? 'on' : ''}`}>
                    <input type="radio" name="cliente" checked={e.tipoCliente === c.valor} onChange={() => set('tipoCliente', c.valor)} />
                    <span><b>{c.rotulo}</b><small>{c.desc}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="campo">
              <span className="rotulo">Origem do produto</span>
              <Segmentado rotulo="Origem do produto" valor={e.importado ? 'i' : 'n'} onChange={(v) => set('importado', v === 'i')}
                opcoes={[{ valor: 'n', rotulo: 'Nacional' }, { valor: 'i', rotulo: 'Importado (4%)' }]} />
            </div>
            <label className="interruptor">
              <input type="checkbox" checked={e.temSt} onChange={(ev) => set('temSt', ev.target.checked)} />
              <span className="interruptor-trilho" aria-hidden="true" />
              <span><b>Produto sujeito a ST</b><small>Substituição tributária, conforme o NCM/CEST</small></span>
            </label>
            {e.temSt && (
              <Campo id="i-mva" rotulo="MVA original do produto" ajuda="Margem de Valor Agregado do protocolo ou convênio do destino.">
                <CampoNumero id="i-mva" sufixo="%" casas={2} percentual max={500} valor={e.mvaOriginal} onChange={(v) => set('mvaOriginal', v)} />
              </Campo>
            )}
            <Campo id="i-valor" rotulo="Valor da venda" ajuda="De uma nota ou do total mensal vendido para o estado.">
              <CampoNumero id="i-valor" prefixo="R$" valor={e.valor} onChange={(v) => set('valor', v)} />
            </Campo>
            <details className="avancado-icms">
              <summary>Ajustes avançados</summary>
              <div className="campo">
                <span className="rotulo">Cálculo do DIFAL (consumidor final)</span>
                <Segmentado rotulo="Cálculo do DIFAL" valor={e.metodoDifal} onChange={(v) => set('metodoDifal', v)}
                  opcoes={[{ valor: 'dupla', rotulo: 'Base dupla' }, { valor: 'unica', rotulo: 'Base única' }]} />
                <p className="ajuda">A LC 190/2022 prevê base dupla; alguns estados ainda usam base única.</p>
              </div>
              {e.vendedorSimples && (
                <label className="checagem">
                  <input type="checkbox" checked={e.difalNoSimples} onChange={(ev) => set('difalNoSimples', ev.target.checked)} />
                  Cobrar DIFAL mesmo sendo do Simples (cenário conservador)
                </label>
              )}
              <div className="grade grade-2">
                <Campo id="i-int" rotulo={`Interna ${e.ufDestino}`}>
                  <CampoNumero id="i-int" sufixo="%" percentual max={40} valor={e.internaDestino ?? ICMS_INTERNA[e.ufDestino]} onChange={(v) => set('internaDestino', v)} />
                </Campo>
                <Campo id="i-fcp" rotulo={`FCP ${e.ufDestino}`}>
                  <CampoNumero id="i-fcp" sufixo="%" percentual max={4} valor={e.fcpDestino ?? FCP_UF[e.ufDestino]} onChange={(v) => set('fcpDestino', v)} />
                </Campo>
              </div>
              <button type="button" className="botao fantasma pequeno" onClick={() => setE(PADRAO)}>Restaurar exemplo</button>
            </details>
          </section>
        </aside>

        <div className="icms-resultados">
          {/* Destino escolhido */}
          <section className="resumo icms-resumo" aria-labelledby="t-dest">
            <div className="recomendacao">
              <p className="sobretitulo">Destino escolhido</p>
              <h2 id="t-dest">{NOMES_UF[e.ufDestino]} <span className="uf-chip">{e.ufDestino}</span></h2>
              <select aria-label="Trocar destino" className="seletor-escuro" value={e.ufDestino} onChange={(ev) => escolherDestino(ev.target.value)}>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf} · {NOMES_UF[uf]}</option>)}
              </select>
              <ul>
                <li>{e.ufDestino === e.ufOrigem ? 'Venda interna, sem DIFAL.' : `Alíquota interestadual de ${pct(r.interestadual, 0)}; interna do destino ${pct(r.interna, 1)}${r.fcp ? ` + FCP ${pct(r.fcp, 1)}` : ''}.`}</li>
                <li>{empate ? 'A carga é igual em todos os destinos para esta operação.' : `${posicao}º menor ICMS entre os 27 estados.`}</li>
              </ul>
            </div>
            <div className="kpis">
              <div className="kpi">
                <span className="kpi-rotulo">ICMS total na operação</span>
                <span className="kpi-valor">{brl(r.total)}</span>
                <span className="kpi-nota">{pct(r.carga, 2)} do valor da venda</span>
              </div>
              <div className="kpi">
                <span className="kpi-rotulo">Recolhido por você</span>
                <span className="kpi-valor">{brl(r.pagoVendedor)}</span>
                <span className="kpi-nota">{e.vendedorSimples ? 'Fora o ICMS que já está no DAS' : 'ICMS próprio, DIFAL e ST'}</span>
              </div>
              <div className="kpi">
                <span className="kpi-rotulo">DIFAL</span>
                <span className="kpi-valor">{brl(r.difal)}</span>
                <span className="kpi-nota">{e.tipoCliente === 'revenda' ? 'Não se aplica a revenda' : e.ufDestino === e.ufOrigem ? 'Não há em venda interna' : 'Com FCP, quando houver'}</span>
              </div>
              <div className="kpi">
                <span className="kpi-rotulo">ICMS-ST</span>
                <span className="kpi-valor">{brl(r.st)}</span>
                <span className="kpi-nota">{!e.temSt ? 'Produto sem ST' : e.tipoCliente !== 'revenda' ? 'Só na venda para revenda' : r.mvaAplicada !== null ? `MVA aplicada de ${pct(r.mvaAplicada, 2)}` : ''}</span>
              </div>
            </div>
          </section>

          <div className="grade-analise">
            <Painel titulo="ICMS total por estado de destino" subtitulo="Clique em um estado para ver o cálculo">
              <MapaBrasil resultados={ranking} origem={e.ufOrigem} destino={e.ufDestino} onDestino={escolherDestino} />
            </Painel>
            <Painel titulo="Melhores destinos" subtitulo="Menor ICMS total para esta operação">
              {empate ? (
                <p className="nota">Todos os estados têm a mesma carga para esta operação.{e.vendedorSimples && e.tipoCliente === 'nao_contribuinte' ? ' No Simples, sem DIFAL, o ICMS fica no DAS e o destino não muda seu custo.' : ''}</p>
              ) : (
                <>
                  <ol className="ranking-lista">
                    {melhores.map((x, i) => (
                      <li key={x.uf} className={x.uf === e.ufDestino ? 'sel' : ''}>
                        <button type="button" onClick={() => escolherDestino(x.uf)}>
                          <span className="pos">{i + 1}</span>
                          <span className="nome">{NOMES_UF[x.uf]}{x.uf === e.ufOrigem && <span className="tag">interna</span>}</span>
                          <span className="num">{brl(x.total)}</span>
                          <span className="num carga">{pct(x.carga, 1)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="leitura">
                    Vender para <b>{NOMES_UF[ranking[0].uf]}</b> gera {brl(pior.total - ranking[0].total)} a menos de ICMS que para{' '}
                    <b>{NOMES_UF[pior.uf]}</b>, o destino mais caro ({pct(pior.carga - ranking[0].carga, 1)} do valor).
                    {e.tipoCliente === 'nao_contribuinte' && !e.vendedorSimples && ' Para consumidor final, o DIFAL leva a carga até a alíquota interna do destino, então pesa mais quem tem alíquota interna maior.'}
                  </p>
                </>
              )}
            </Painel>
          </div>

          <Painel titulo={`Memória de cálculo · ${e.ufOrigem} → ${e.ufDestino}`} subtitulo={`Venda de ${brl(e.valor)}`}>
            <div className="tabela-rolagem">
              <table className="tabela memoria">
                <thead><tr><th>Tributo</th><th className="num">Valor</th><th>Quem recolhe</th><th>Cálculo</th></tr></thead>
                <tbody>
                  {r.linhas.map((l) => (
                    <tr key={l.tributo}>
                      <th scope="row">{l.tributo}</th>
                      <td className="num">{brl(l.valor)}</td>
                      <td><span className={`pilula ${l.quemPaga === 'vendedor' ? 'neutra' : 'info'}`}>{QUEM[l.quemPaga]}</span></td>
                      <td className="calculo">{l.memoria}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><th scope="row">Total</th><td className="num">{brl(r.total)}</td><td /><td /></tr></tfoot>
              </table>
            </div>
          </Painel>

          <Painel titulo="Todos os estados" subtitulo="Ordenados do menor para o maior ICMS total">
            <div className="tabela-rolagem">
              <table className="tabela densa">
                <thead>
                  <tr>
                    <th>#</th><th>Destino</th><th className="num">Interestadual</th><th className="num">Interna</th>
                    <th className="num">ICMS próprio</th><th className="num">DIFAL</th><th className="num">ST</th>
                    <th className="num total">Total</th><th className="num">% da venda</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((x, i) => (
                    <tr key={x.uf} className={`clicavel ${x.uf === e.ufDestino ? 'linha-sel' : ''}`} onClick={() => escolherDestino(x.uf)}>
                      <td className="num">{i + 1}</td>
                      <th scope="row">{NOMES_UF[x.uf]} <span className="sigla">{x.uf}</span>{x.uf === e.ufOrigem && <span className="tag">interna</span>}</th>
                      <td className="num">{x.uf === e.ufOrigem ? '—' : pct(x.interestadual, 0)}</td>
                      <td className="num">{pct(x.interna, 1)}{x.fcp ? ` + ${pct(x.fcp, 0)}` : ''}</td>
                      <td className="num">{e.vendedorSimples ? 'DAS' : brl(x.icmsProprio)}</td>
                      <td className="num">{brl(x.difal)}</td>
                      <td className="num">{brl(x.st)}</td>
                      <td className={`num total ${i < 3 && !empate ? 'min' : ''}`}>{brl(x.total)}</td>
                      <td className="num">{pct(x.carga, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>

          <div className="grade-analise igual">
            <Painel titulo={`${e.ufOrigem} → ${e.ufDestino} na transição da Reforma`} subtitulo="ICMS total da operação, ano a ano">
              <Transicao dados={transicao.map((t) => ({ ano: t.ano, valor: t.r.total }))} />
              <p className="nota">O ICMS cai 10 pontos por ano de 2029 a 2032 e acaba em 2033. O IBS, que o substitui, é cobrado no estado de destino, então a escolha do estado pesa cada vez menos.</p>
            </Painel>
            <Painel titulo="Premissas e cuidados" subtitulo="Leia antes de decidir">
              <ul className="atencao">
                <li className="sev-atencao"><Icone tipo="atencao" /><div><b>ST depende do produto e dos estados</b><p>Só há ST se existir protocolo ou convênio entre origem e destino para o seu NCM/CEST, e a MVA vem desse ato (Convênio ICMS 142/2018).</p></div></li>
                <li className="sev-info"><Icone tipo="info" /><div><b>FCP varia por produto</b><p>Usamos o adicional geral do RJ (2%). Em vários estados o FCP vale só para itens listados; ajuste o FCP do destino nos ajustes avançados.</p></div></li>
                <li className="sev-info"><Icone tipo="info" /><div><b>DIFAL no Simples</b><p>A posição predominante (STF, ADI 5464; SEFAZ-SP, RC 32359/2025) é que o optante não recolhe DIFAL na venda a não contribuinte. Alguns estados divergem.</p></div></li>
                <li className="sev-info"><Icone tipo="info" /><div><b>Alíquotas modais</b><p>Alíquotas internas gerais de 2026. Produtos com alíquota específica (combustíveis, energia, bebidas, cesta básica) têm carga diferente.</p></div></li>
              </ul>
            </Painel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Transicao({ dados }: { dados: { ano: number; valor: number }[] }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const W = 520, H = 200, B = 28, T = 22;
  const larg = (W - 20) / dados.length;
  return (
    <svg className="transicao" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ICMS total por ano, de 2026 a 2033">
      <line x1={10} x2={W - 10} y1={H - B} y2={H - B} className="eixo-base" />
      {dados.map((d, i) => {
        const h = ((H - B - T) * d.valor) / max;
        const x = 10 + i * larg + larg * 0.18;
        return (
          <g key={d.ano}>
            <rect x={x} y={H - B - h} width={larg * 0.64} height={Math.max(h, 0)} rx={4} className={d.ano >= 2029 ? 'barra-reduzida' : 'barra-cheia'} />
            <text x={x + larg * 0.32} y={H - B - h - 6} textAnchor="middle" className="rotulo-barra">{d.valor ? brl(d.valor).replace(/,\d\d$/, '') : '—'}</text>
            <text x={x + larg * 0.32} y={H - 8} textAnchor="middle" className="eixo-txt">{d.ano}</text>
          </g>
        );
      })}
    </svg>
  );
}
