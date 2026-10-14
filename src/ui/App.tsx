import { useEffect, useState, type ReactNode } from 'react';
import { BarraEmpresa } from './BarraEmpresa';
import {
  FILTRO_PADRAO, OPERACAO_PADRAO, entradaInicial, entradaValida, filtroValido, operacaoValida, usePersistente,
} from './estado';
import type { Exemplo } from './exemplos';
import { ModuloIcms } from './icms/ModuloIcms';
import { ModuloBeneficios } from './ModuloBeneficios';
import { ModuloRegimes, type EtapaRegimes } from './ModuloRegimes';
import { ModuloRelatorio } from './ModuloRelatorio';

type Modulo = 'regimes' | 'st-difal' | 'beneficios' | 'relatorio';

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONES: Record<Modulo, ReactNode> = {
  regimes: <path {...traco} d="M3 15V9M8 15V5M13 15v-4M2 17h14" />,
  'st-difal': <><path {...traco} d="M2 6h10M9 3l3 3-3 3" /><path {...traco} d="M16 12H6M9 9l-3 3 3 3" /></>,
  beneficios: <><path {...traco} d="M9 2l2 4.2 4.6.6-3.3 3.2.8 4.6L9 12.4 4.9 14.6l.8-4.6L2.4 6.8 7 6.2z" /></>,
  relatorio: <><path {...traco} d="M5 2h6l3 3v11H5z" /><path {...traco} d="M8 9h4M8 12h4" /></>,
};

const MODULOS: { id: Modulo; rotulo: string }[] = [
  { id: 'regimes', rotulo: 'Regimes' },
  { id: 'st-difal', rotulo: 'ST e DIFAL' },
  { id: 'beneficios', rotulo: 'Benefícios' },
  { id: 'relatorio', rotulo: 'Relatório' },
];

/** Dentro de um iframe (ex.: página publicada) a impressão costuma ser bloqueada. */
const podeImprimir = (() => { try { return window.self === window.top; } catch { return false; } })();

const lerHash = (): Modulo => {
  const h = window.location.hash.replace('#', '');
  return MODULOS.some((m) => m.id === h) ? (h as Modulo) : 'regimes';
};

export function App() {
  const [modulo, setModulo] = useState<Modulo>(lerHash);
  const [etapa, setEtapa] = useState<EtapaRegimes>('dados');
  // Um cadastro da empresa para todos os módulos
  const [empresa, setEmpresa] = usePersistente('simulador-reforma:entrada:v3', entradaInicial, entradaValida);
  const [operacao, setOperacao] = usePersistente('simulador-reforma:operacao:v1', () => OPERACAO_PADRAO, operacaoValida);
  const [filtro, setFiltro] = usePersistente('simulador-reforma:beneficios:v1', () => FILTRO_PADRAO, filtroValido);

  useEffect(() => {
    const ouvir = () => setModulo(lerHash());
    window.addEventListener('hashchange', ouvir);
    return () => window.removeEventListener('hashchange', ouvir);
  }, []);
  const aplicarExemplo = (x: Exemplo) => {
    setEmpresa(x.entrada);
    setOperacao({ ...OPERACAO_PADRAO, ...x.operacao, valor: x.operacao?.valor ?? Math.round(x.entrada.faturamentoMensal * 0.3) });
    setFiltro({ perfis: x.perfis ?? ['ecommerce'] });
  };
  const ir = (m: Modulo) => {
    setModulo(m);
    try { history.replaceState(null, '', `#${m}`); } catch { /* ignora */ }
    window.scrollTo({ top: 0 });
  };
  const editarEmpresa = () => { setEtapa('dados'); ir('regimes'); };
  const mostrarBarra = !(modulo === 'regimes' && etapa === 'dados') && modulo !== 'relatorio';

  return (
    <div className="app">
      <header className="barra">
        <div className="barra-interna">
          <div className="marca">
            <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
              <rect width="28" height="28" rx="6" className="marca-fundo" />
              <rect x="7" y="14" width="3.2" height="7" rx="1" className="marca-barra" />
              <rect x="12.4" y="10" width="3.2" height="11" rx="1" className="marca-barra" />
              <rect x="17.8" y="6.5" width="3.2" height="14.5" rx="1" className="marca-barra forte" />
            </svg>
            <div>
              <span className="marca-nome">Simulador Tributário</span>
              <span className="marca-sub">Análise tributária na Reforma</span>
            </div>
          </div>
          <nav className="modulos" aria-label="Módulos">
            {MODULOS.map((m) => (
              <button key={m.id} type="button" className={`modulo ${modulo === m.id ? 'on' : ''}`}
                aria-current={modulo === m.id ? 'page' : undefined} onClick={() => ir(m.id)}>
                <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">{ICONES[m.id]}</svg>
                {m.rotulo}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="conteudo">
        {mostrarBarra && <BarraEmpresa empresa={empresa} onEditar={editarEmpresa} />}
        {modulo === 'regimes' && (
          <ModuloRegimes entrada={empresa} onChange={setEmpresa} onExemplo={aplicarExemplo} etapa={etapa} onEtapa={setEtapa} />
        )}
        {modulo === 'st-difal' && <ModuloIcms empresa={empresa} op={operacao} onOp={setOperacao} />}
        {modulo === 'beneficios' && (
          <ModuloBeneficios empresa={empresa} op={operacao} onOp={setOperacao} filtro={filtro} onFiltro={setFiltro} />
        )}
        {modulo === 'relatorio' && <ModuloRelatorio empresa={empresa} op={operacao} filtro={filtro} onIr={ir} podeImprimir={podeImprimir} />}
      </main>

      <footer className="rodape">
        Estimativas com base na legislação vigente e nas premissas informadas. Não substituem a análise de um contador.
      </footer>
    </div>
  );
}
