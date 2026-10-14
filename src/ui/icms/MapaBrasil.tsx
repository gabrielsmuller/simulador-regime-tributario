import { NOMES_UF, type ResultadoIcms } from '../../motor';
import { brl, pct } from '../formato';

/** Posição [linha, coluna] de cada UF num cartograma de blocos do Brasil. */
const POS: Record<string, [number, number]> = {
  RR: [0, 1], AP: [0, 2],
  AM: [1, 1], PA: [1, 2], MA: [1, 3], CE: [1, 4], RN: [1, 5],
  AC: [2, 0], RO: [2, 1], TO: [2, 2], PI: [2, 3], PE: [2, 4], PB: [2, 5],
  MT: [3, 1], DF: [3, 2], BA: [3, 3], SE: [3, 4], AL: [3, 5],
  MS: [4, 1], GO: [4, 2], MG: [4, 3], ES: [4, 4],
  PR: [5, 1], SP: [5, 2], RJ: [5, 3],
  SC: [6, 1],
  RS: [7, 1],
};

/** Escala sequencial de um tom (claro = menor ICMS). */
export const RAMPA = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

export function nivel(v: number, min: number, max: number) {
  if (max - min < 0.005) return 0;
  return Math.round(((v - min) / (max - min)) * (RAMPA.length - 1));
}

export function MapaBrasil({ resultados, origem, destino, onDestino }: {
  resultados: ResultadoIcms[]; origem: string; destino: string; onDestino: (uf: string) => void;
}) {
  const totais = resultados.map((r) => r.total);
  const min = Math.min(...totais), max = Math.max(...totais);
  const porUf = Object.fromEntries(resultados.map((r) => [r.uf, r]));

  return (
    <div className="mapa-wrap">
      <div className="mapa" role="group" aria-label="ICMS total por estado de destino">
        {Object.entries(POS).map(([uf, [l, c]]) => {
          const r = porUf[uf];
          const n = nivel(r.total, min, max);
          return (
            <button key={uf} type="button" onClick={() => onDestino(uf)}
              className={`bloco ${uf === destino ? 'sel' : ''} ${uf === origem ? 'origem' : ''} ${n >= 3 ? 'escuro' : ''}`}
              style={{ gridRow: l + 1, gridColumn: c + 1, background: RAMPA[n] }}
              aria-pressed={uf === destino}
              aria-label={`${NOMES_UF[uf]}: ${brl(r.total)} (${pct(r.carga, 1)})${uf === origem ? ', estado de origem' : ''}`}
              title={`${NOMES_UF[uf]} · ${brl(r.total)} · ${pct(r.carga, 1)}`}>
              <b>{uf}</b>
              <span>{pct(r.carga, 1)}</span>
            </button>
          );
        })}
      </div>
      <div className="mapa-legenda">
        <span>{pct(Math.min(...resultados.map((r) => r.carga)), 1)}</span>
        <span className="mapa-escala">{RAMPA.map((c) => <i key={c} style={{ background: c }} />)}</span>
        <span>{pct(Math.max(...resultados.map((r) => r.carga)), 1)}</span>
        <span className="mapa-chave"><i className="chave-origem" />origem</span>
        <span className="mapa-chave"><i className="chave-sel" />destino escolhido</span>
      </div>
    </div>
  );
}
