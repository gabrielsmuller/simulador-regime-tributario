import { useMemo, useState } from 'react';
import {
  ICMS_INTERNA, FCP_UF, NOMES_UF, UFS, calcularIcms, rankingDestinos, transicaoIcms,
  type Entrada, type QuemPaga, type TipoCliente,
} from '../../motor';
import { CampoNumero, Icone, Painel, PainelAbas, Segmentado } from '../campos';
import { OPERACAO_PADRAO, icmsDaEmpresa, type OperacaoIcms } from '../estado';
import { brl, pct } from '../formato';
import { MapaBrasil } from './MapaBrasil';

const CLIENTES: { valor: TipoCliente; rotulo: string }[] = [
  { valor: 'nao_contribuinte', rotulo: 'Consumidor final (DIFAL)' },
  { valor: 'revenda', rotulo: 'Empresa que revende (ST)' },
  { valor: 'uso_consumo', rotulo: 'Empresa para uso próprio' },
];

const QUEM: Record<QuemPaga, string> = { vendedor: 'Você', comprador: 'Comprador', das: 'No DAS' };
type AbaIcms = 'memoria' | 'estados' | 'transicao' | 'premissas';

export function ModuloIcms({ empresa, op, onOp }: { empresa: Entrada; op: OperacaoIcms; onOp: (o: OperacaoIcms) => void }) {
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const [aba, setAba] = useState<AbaIcms>('memoria');
  const e = icmsDaEmpresa(empresa, op);
  const set = <K extends keyof OperacaoIcms>(k: K, v: OperacaoIcms[K]) => onOp({ ...op, [k]: v });
  const escolherDestino = (uf: string) => onOp({ ...op, ufDestino: uf, internaDestino: undefined, fcpDestino: undefined });

  const chave = JSON.stringify(e);
  const r = useMemo(() => calcularIcms(e), [chave]);
  const ranking = useMemo(() => rankingDestinos(e), [chave]);
  const transicao = useMemo(() => transicaoIcms(e), [chave]);
  const fora = ranking.filter((x) => x.uf !== e.ufOrigem);
  const posicao = fora.findIndex((x) => x.uf === e.ufDestino) + 1;
  const empate = fora[fora.length - 1].total - fora[0].total < 0.01;

  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <h1>ST e DIFAL por estado</h1>
        <p>O ICMS de uma venda saindo de {NOMES_UF[e.ufOrigem]} para cada estado do país.</p>
      </div>

      {/* Parâmetros da operação, numa linha */}
      <section className="barra-parametros" aria-label="Dados da operação">
        <div className="parametros">
          <label className="parametro">
            <span>Destino</span>
            <select value={op.ufDestino} onChange={(ev) => escolherDestino(ev.target.value)}>
              {UFS.map((uf) => <option key={uf} value={uf}>{NOMES_UF[uf]}</option>)}
            </select>
          </label>
          <label className="parametro">
            <span>Cliente</span>
            <select value={op.tipoCliente} onChange={(ev) => set('tipoCliente', ev.target.value as TipoCliente)}>
              {CLIENTES.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </select>
          </label>
          <div className="parametro">
            <span>Produto</span>
            <Segmentado rotulo="Origem do produto" valor={op.importado ? 'i' : 'n'} onChange={(v) => set('importado', v === 'i')}
              opcoes={[{ valor: 'n', rotulo: 'Nacional' }, { valor: 'i', rotulo: 'Importado' }]} />
          </div>
          <div className="parametro">
            <span>Substituição tributária</span>
            <div className="st-linha">
              <label className="interruptor compacto">
                <input type="checkbox" checked={op.temSt} onChange={(ev) => set('temSt', ev.target.checked)} />
                <span className="interruptor-trilho" aria-hidden="true" />
                <span className="sr-only">Produto sujeito a ST</span>
              </label>
              {op.temSt
                ? <CampoNumero id="i-mva" sufixo="% MVA" casas={1} percentual max={500} valor={op.mvaOriginal} onChange={(v) => set('mvaOriginal', v)} />
                : <span className="parametro-off">Sem ST</span>}
            </div>
          </div>
          <label className="parametro">
            <span>Valor da venda</span>
            <CampoNumero id="i-valor" prefixo="R$" casas={0} valor={op.valor} onChange={(v) => set('valor', v)} />
          </label>
        </div>
        <div className="parametros-rodape">
          <button type="button" className="link" aria-expanded={maisOpcoes} onClick={() => setMaisOpcoes(!maisOpcoes)}>
            {maisOpcoes ? 'Ocultar opções avançadas' : 'Opções avançadas: método do DIFAL, alíquota interna e FCP do destino'}
          </button>
        </div>
        {maisOpcoes && (
          <div className="parametros extras">
            <div className="parametro">
              <span>Cálculo do DIFAL</span>
              <Segmentado rotulo="Cálculo do DIFAL" valor={op.metodoDifal} onChange={(v) => set('metodoDifal', v)}
                opcoes={[{ valor: 'dupla', rotulo: 'Base dupla' }, { valor: 'unica', rotulo: 'Base única' }]} />
            </div>
            <label className="parametro">
              <span>Interna {op.ufDestino}</span>
              <CampoNumero id="i-int" sufixo="%" percentual max={40} valor={op.internaDestino ?? ICMS_INTERNA[op.ufDestino]} onChange={(v) => set('internaDestino', v)} />
            </label>
            <label className="parametro">
              <span>FCP {op.ufDestino}</span>
              <CampoNumero id="i-fcp" sufixo="%" percentual max={4} valor={op.fcpDestino ?? FCP_UF[op.ufDestino]} onChange={(v) => set('fcpDestino', v)} />
            </label>
            {e.vendedorSimples && (
              <label className="checagem">
                <input type="checkbox" checked={op.difalNoSimples} onChange={(ev) => set('difalNoSimples', ev.target.checked)} />
                Cobrar DIFAL mesmo no Simples (conservador)
              </label>
            )}
            <button type="button" className="link" onClick={() => onOp(OPERACAO_PADRAO)}>Restaurar padrão</button>
          </div>
        )}
      </section>

      {/* Resultado do destino escolhido */}
      <section className="resumo icms-resumo" aria-labelledby="t-dest">
        <div className="recomendacao">
          <p className="sobretitulo">{e.ufOrigem} → {e.ufDestino}</p>
          <h2 id="t-dest">{NOMES_UF[e.ufDestino]}</h2>
          <p className="destaque-carga"><b>{pct(r.carga, 1)}</b> de ICMS sobre a venda</p>
          <p className="rec-nota">
            {e.ufDestino === e.ufOrigem ? 'Venda interna, sem DIFAL.'
              : empate ? 'Mesma carga em todos os estados.'
              : `${posicao}º menor carga entre os 26 outros estados.`}
          </p>
        </div>
        <div className="kpis">
          <div className="kpi">
            <span className="kpi-rotulo">ICMS total</span>
            <span className="kpi-valor">{brl(r.total)}</span>
            <span className="kpi-nota">Interestadual {e.ufDestino === e.ufOrigem ? '—' : pct(r.interestadual, 0)} · interna {pct(r.interna, 1)}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">Recolhido por você</span>
            <span className="kpi-valor">{brl(r.pagoVendedor)}</span>
            <span className="kpi-nota">{e.vendedorSimples ? 'Fora o ICMS que já está no DAS' : 'ICMS próprio, DIFAL e ST'}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">DIFAL</span>
            <span className="kpi-valor">{brl(r.difal)}</span>
            <span className="kpi-nota">{op.tipoCliente === 'revenda' ? 'Não se aplica a revenda' : e.ufDestino === e.ufOrigem ? 'Não há em venda interna' : 'Diferença até a alíquota do destino'}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">ICMS-ST</span>
            <span className="kpi-valor">{brl(r.st)}</span>
            <span className="kpi-nota">{!op.temSt ? 'Produto sem ST' : op.tipoCliente !== 'revenda' ? 'Só na venda para revenda' : `MVA aplicada de ${pct(r.mvaAplicada ?? 0, 1)}`}</span>
          </div>
        </div>
      </section>

      <div className="grade-analise">
        <Painel titulo="Carga de ICMS por estado" subtitulo="Clique em um estado para escolher o destino">
          <MapaBrasil resultados={ranking} origem={e.ufOrigem} destino={e.ufDestino} onDestino={escolherDestino} />
        </Painel>
        <Painel titulo="Menor carga fora do estado" subtitulo="Os 5 destinos mais vantajosos">
          {empate ? (
            <p className="nota">Todos os estados têm a mesma carga para esta operação.{e.vendedorSimples && op.tipoCliente === 'nao_contribuinte' ? ' No Simples, sem DIFAL, o ICMS fica no DAS.' : ''}</p>
          ) : (
            <>
              <ol className="ranking-lista">
                {fora.slice(0, 5).map((x, i) => (
                  <li key={x.uf} className={x.uf === e.ufDestino ? 'sel' : ''}>
                    <button type="button" onClick={() => escolherDestino(x.uf)}>
                      <span className="pos">{i + 1}</span>
                      <span className="nome">{NOMES_UF[x.uf]}</span>
                      <span className="ranking-barra"><i style={{ width: `${(x.carga / fora[fora.length - 1].carga) * 100}%` }} /></span>
                      <span className="num carga">{pct(x.carga, 1)}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="leitura">
                De <b>{NOMES_UF[fora[0].uf]}</b> a <b>{NOMES_UF[fora[fora.length - 1].uf]}</b>, a diferença é de {brl(fora[fora.length - 1].total - fora[0].total)} nesta venda.
              </p>
            </>
          )}
        </Painel>
      </div>

      <PainelAbas abas={[
        { id: 'memoria', rotulo: 'Memória de cálculo' },
        { id: 'estados', rotulo: 'Todos os estados' },
        { id: 'transicao', rotulo: 'Até 2033' },
        { id: 'premissas', rotulo: 'Premissas', contador: 4 },
      ]} ativa={aba} onAba={setAba}>
        {aba === 'memoria' && (
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
        )}

        {aba === 'estados' && (
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
                    <th scope="row">{NOMES_UF[x.uf]}{x.uf === e.ufOrigem && <span className="tag">interna</span>}</th>
                    <td className="num">{x.uf === e.ufOrigem ? '—' : pct(x.interestadual, 0)}</td>
                    <td className="num">{pct(x.interna, 1)}{x.fcp ? ` + ${pct(x.fcp, 0)}` : ''}</td>
                    <td className="num">{e.vendedorSimples ? 'DAS' : brl(x.icmsProprio)}</td>
                    <td className="num">{brl(x.difal)}</td>
                    <td className="num">{brl(x.st)}</td>
                    <td className="num total">{brl(x.total)}</td>
                    <td className="num">{pct(x.carga, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aba === 'transicao' && (
          <div className="duas-colunas">
            <Transicao dados={transicao.map((t) => ({ ano: t.ano, valor: t.r.total }))} />
            <p className="nota">O ICMS cai 10 pontos por ano de 2029 a 2032 e acaba em 2033. O IBS, que o substitui, é cobrado no destino, então a escolha do estado pesa cada vez menos.</p>
          </div>
        )}

        {aba === 'premissas' && (
          <ul className="atencao grade-atencao">
            <li className="sev-atencao"><Icone tipo="atencao" /><div><b>ST depende do produto e dos estados</b><p>Só há ST com protocolo ou convênio entre origem e destino para o seu NCM/CEST. A MVA vem desse ato (Conv. ICMS 142/2018).</p></div></li>
            <li className="sev-info"><Icone tipo="info" /><div><b>FCP varia por produto</b><p>Usamos o adicional geral do RJ (2%). Em outros estados ele vale para itens listados; ajuste em "Mais opções".</p></div></li>
            <li className="sev-info"><Icone tipo="info" /><div><b>DIFAL no Simples</b><p>Posição predominante: o optante não recolhe DIFAL na venda a não contribuinte (STF, ADI 5464; SEFAZ-SP, RC 32359/2025).</p></div></li>
            <li className="sev-info"><Icone tipo="info" /><div><b>Alíquotas modais de 2026</b><p>Combustíveis, energia, bebidas e cesta básica têm alíquotas específicas.</p></div></li>
          </ul>
        )}
      </PainelAbas>
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
