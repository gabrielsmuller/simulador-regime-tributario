import { useEffect, useState, type ReactNode } from 'react';
import { escreverNumero, lerNumero } from './formato';

interface NumProps {
  id: string;
  valor: number;
  onChange: (v: number) => void;
  prefixo?: string;
  sufixo?: string;
  casas?: number;
  /** guarda fração (0,1) e mostra percentual (10) */
  percentual?: boolean;
  max?: number;
}

export function CampoNumero({ id, valor, onChange, prefixo, sufixo, casas = 2, percentual, max }: NumProps) {
  const mostrar = percentual ? valor * 100 : valor;
  const [txt, setTxt] = useState(escreverNumero(mostrar, casas));
  const [foco, setFoco] = useState(false);
  useEffect(() => { if (!foco) setTxt(escreverNumero(mostrar, casas)); }, [mostrar, casas, foco]);
  return (
    <div className="entrada-num">
      {prefixo && <span className="afixo">{prefixo}</span>}
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={txt}
        onFocus={(ev) => { setFoco(true); ev.target.select(); }}
        onBlur={() => setFoco(false)}
        onChange={(ev) => {
          setTxt(ev.target.value);
          let n = Math.max(0, lerNumero(ev.target.value));
          if (max !== undefined) n = Math.min(max, n);
          onChange(percentual ? n / 100 : n);
        }}
      />
      {sufixo && <span className="afixo">{sufixo}</span>}
    </div>
  );
}

export function Campo({ id, rotulo, ajuda, extra, children }: {
  id: string; rotulo: string; ajuda?: ReactNode; extra?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="campo">
      <div className="campo-topo">
        <label htmlFor={id}>{rotulo}</label>
        {extra && <span className="campo-extra">{extra}</span>}
      </div>
      {children}
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </div>
  );
}

export function Secao({ numero, titulo, descricao, acao, children }: {
  numero?: number; titulo: string; descricao?: string; acao?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="secao">
      <header className="secao-topo">
        {numero !== undefined && <span className="secao-num" aria-hidden="true">{numero}</span>}
        <div className="secao-titulos">
          <h2>{titulo}</h2>
          {descricao && <p>{descricao}</p>}
        </div>
        {acao && <div className="secao-acao">{acao}</div>}
      </header>
      <div className="secao-corpo">{children}</div>
    </section>
  );
}

export function Painel({ titulo, subtitulo, acao, className = '', children }: {
  titulo: string; subtitulo?: ReactNode; acao?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <section className={`painel ${className}`}>
      <header className="painel-topo">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {acao && <div className="painel-acao">{acao}</div>}
      </header>
      {children}
    </section>
  );
}

export function Segmentado<T extends string | number>({ valor, opcoes, onChange, rotulo }: {
  valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (v: T) => void; rotulo: string;
}) {
  return (
    <div className="segmentado" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={String(o.valor)} type="button" aria-pressed={o.valor === valor}
          className={o.valor === valor ? 'on' : ''} onClick={() => onChange(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export type Severidade = 'critico' | 'atencao' | 'info' | 'ok';

export function Icone({ tipo }: { tipo: Severidade }) {
  const caminho = {
    critico: <><circle cx="8" cy="8" r="7" /><path d="M8 4.5v4M8 11h.01" /></>,
    atencao: <><path d="M8 1.8 15 14H1z" /><path d="M8 6.5v3M8 11.8h.01" /></>,
    info: <><circle cx="8" cy="8" r="7" /><path d="M8 7.5v4M8 4.8h.01" /></>,
    ok: <><circle cx="8" cy="8" r="7" /><path d="m5 8.2 2 2 4-4.2" /></>,
  }[tipo];
  return (
    <svg className={`icone icone-${tipo}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {caminho}
    </svg>
  );
}
