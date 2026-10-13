import { useState } from 'react';
import { CATEGORIAS, NOMES_REGIME, REGIMES, type Ano, type Categoria, type Regime, type Resultado, type ResultadoAno } from '../motor';
import { brl, brlCurto, pct } from './formato';

const W = 720, H = 300, L = 64, R = 96, T = 20, B = 36;

function escala(max: number): number[] {
  const bruto = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? bruto;
  return Array.from({ length: Math.ceil(max / passo) + 1 }, (_, i) => i * passo);
}

/** Linhas da carga mensal de 2027 a 2033, com crosshair e tooltip. */
export function GraficoEvolucao({ resultado, ano, onAno, regimeAtual }: {
  resultado: Resultado; ano: Ano; onAno: (a: Ano) => void; regimeAtual: Regime;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const anos = resultado.anos;
  const valores = anos.flatMap((a) => REGIMES.filter((r) => a.regimes[r].elegivel).map((r) => a.regimes[r].carga));
  const ys = escala(Math.max(1, ...valores));
  const yMax = ys[ys.length - 1];
  const x = (i: number) => L + (i * (W - L - R)) / (anos.length - 1);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const iSel = anos.findIndex((a) => a.ano === ano);
  const iFoco = hover ?? iSel;
  const ultimo = anos.length - 1;

  // rótulos diretos à direita, afastados para não colidir
  const rotulos = REGIMES.filter((r) => anos[ultimo].regimes[r].elegivel)
    .map((r) => ({ r, y: y(anos[ultimo].regimes[r].carga) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < rotulos.length; i++) rotulos[i].y = Math.max(rotulos[i].y, rotulos[i - 1].y + 14);

  const trechos = (r: Regime) => {
    const out: [number, number][][] = [[]];
    anos.forEach((a, i) => (a.regimes[r].elegivel ? out[out.length - 1].push([x(i), y(a.regimes[r].carga)]) : out.push([])));
    return out.filter((t) => t.length > 0);
  };

  const foco = anos[iFoco];
  const ladoDireito = iFoco < anos.length / 2;

  return (
    <figure className="grafico" onMouseLeave={() => setHover(null)}>
      <div className="grafico-area">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Carga tributária mensal por regime, de 2027 a 2033">
          {ys.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? 'eixo-base' : 'grade'} />
              <text x={L - 10} y={y(v) + 4} textAnchor="end" className="eixo-txt">{brlCurto(v)}</text>
            </g>
          ))}
          {anos.map((a, i) => (
            <text key={a.ano} x={x(i)} y={H - 12} textAnchor="middle" className={`eixo-txt ${i === iSel ? 'forte' : ''}`}>{a.ano}</text>
          ))}
          <line x1={x(iFoco)} x2={x(iFoco)} y1={T} y2={H - B} className="cruz" />
          {resultado.viradas.map((v) => {
            const i = anos.findIndex((a) => a.ano === v.ano);
            return <circle key={v.ano} cx={x(i)} cy={y(anos[i].regimes[v.para].carga)} r={10} className="virada" />;
          })}
          {REGIMES.map((r) => trechos(r).map((t, k) => (
            <g key={`${r}${k}`} className={`serie c-${r} ${r === regimeAtual ? 'atual' : ''}`}>
              <polyline points={t.map((p) => p.join(',')).join(' ')} />
              {t.map(([cx, cy], j) => <circle key={j} cx={cx} cy={cy} r={4} />)}
            </g>
          )))}
          {rotulos.map(({ r, y: ry }) => (
            <text key={r} x={x(ultimo) + 12} y={ry + 4} className="rotulo-serie">{NOMES_REGIME[r].curto}</text>
          ))}
          {anos.map((a, i) => (
            <rect key={a.ano} x={x(i) - (W - L - R) / 12} y={T} width={(W - L - R) / 6} height={H - T - B}
              className="alvo" onMouseEnter={() => setHover(i)} onClick={() => onAno(a.ano)} />
          ))}
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: `${(x(iFoco) / W) * 100}%`, transform: ladoDireito ? 'translateX(14px)' : 'translateX(calc(-100% - 14px))' }}>
            <strong>{foco.ano}</strong>
            {REGIMES.filter((r) => foco.regimes[r].elegivel)
              .sort((a, b) => foco.regimes[a].carga - foco.regimes[b].carga)
              .map((r) => (
                <div key={r} className="tooltip-linha">
                  <i className={`ponto c-${r}`} />
                  <span>{NOMES_REGIME[r].nome}</span>
                  <b>{brl(foco.regimes[r].carga)}</b>
                </div>
              ))}
          </div>
        )}
      </div>
      <figcaption className="legenda">
        {REGIMES.map((r) => <span key={r}><i className={`traco c-${r}`} />{NOMES_REGIME[r].nome}</span>)}
        {resultado.viradas.length > 0 && <span><i className="anel" />Ponto de virada</span>}
      </figcaption>
    </figure>
  );
}

/** Barras empilhadas: de que tributos vem a carga de cada regime no ano. */
export function Composicao({ dados, regimeSel, onRegime }: {
  dados: ResultadoAno; regimeSel: Regime; onRegime: (r: Regime) => void;
}) {
  const [hover, setHover] = useState<{ r: Regime; c: Categoria } | null>(null);
  const max = Math.max(...REGIMES.map((r) => dados.regimes[r].carga), 1);
  const porCategoria = (r: Regime) => {
    const soma: Record<Categoria, number> = { DAS: 0, CBS: 0, IBS: 0, LOCAL: 0, RENDA: 0, INSS: 0 };
    for (const l of dados.regimes[r].linhas) soma[l.categoria] += l.valor;
    return soma;
  };
  const presentes = CATEGORIAS.filter((c) => REGIMES.some((r) => porCategoria(r)[c.id] > 0));

  return (
    <div className="composicao">
      <div className="legenda">
        {presentes.map((c) => <span key={c.id}><i className={`quadrado k-${c.id}`} />{c.nome}</span>)}
      </div>
      <div className="barras">
        {REGIMES.map((r) => {
          const res = dados.regimes[r];
          const soma = porCategoria(r);
          return (
            <button key={r} type="button" className={`barra-linha ${r === regimeSel ? 'on' : ''}`} onClick={() => onRegime(r)}
              disabled={!res.elegivel}>
              <span className="barra-nome">{NOMES_REGIME[r].nome}</span>
              <span className="barra-trilho">
                {res.elegivel ? (
                  <span className="barra-pilha" style={{ width: `${(res.carga / max) * 100}%` }}>
                    {presentes.filter((c) => soma[c.id] > 0).map((c) => (
                      <span key={c.id} className={`segmento k-${c.id}`} style={{ flexGrow: soma[c.id] }}
                        onMouseEnter={() => setHover({ r, c: c.id })} onMouseLeave={() => setHover(null)}
                        aria-label={`${c.nome}: ${brl(soma[c.id])}`} />
                    ))}
                  </span>
                ) : <span className="barra-vazia">Indisponível</span>}
              </span>
              <span className="barra-total">{res.elegivel ? brl(res.carga) : '—'}</span>
            </button>
          );
        })}
      </div>
      <p className="composicao-detalhe" aria-live="polite">
        {hover ? (() => {
          const v = porCategoria(hover.r)[hover.c];
          const nome = CATEGORIAS.find((c) => c.id === hover.c)!.nome;
          return <><b>{NOMES_REGIME[hover.r].nome} · {nome}:</b> {brl(v)} por mês ({pct(v / dados.regimes[hover.r].carga, 1)} da carga)</>;
        })() : 'Passe o mouse sobre um segmento para ver o valor. Clique em um regime para abrir a memória de cálculo.'}
      </p>
    </div>
  );
}
