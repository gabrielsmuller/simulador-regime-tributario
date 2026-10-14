import { useEffect, useState, type ReactNode } from 'react';
import { NOMES_REGIME, NOMES_UF, VERSAO_PARAMETROS } from '../motor';
import { validar } from './diagnostico';
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
const Icone = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" className="nav-icone">{children}</svg>
);
const ICONES: Record<Modulo | 'dados' | 'analise' | 'menu' | 'recolher', ReactNode> = {
  regimes: <path {...traco} d="M3 15V9M8 15V5M13 15v-4M2 17h14" />,
  'st-difal': <><path {...traco} d="M2 6h10M9 3l3 3-3 3" /><path {...traco} d="M16 12H6M9 9l-3 3 3 3" /></>,
  beneficios: <path {...traco} d="M9 2l2 4.2 4.6.6-3.3 3.2.8 4.6L9 12.4 4.9 14.6l.8-4.6L2.4 6.8 7 6.2z" />,
  relatorio: <><path {...traco} d="M5 2h6l3 3v11H5z" /><path {...traco} d="M8 9h4M8 12h4" /></>,
  dados: <><rect {...traco} x="3" y="3" width="12" height="12" rx="2" /><path {...traco} d="M6 7h6M6 10h4" /></>,
  analise: <path {...traco} d="M3 13l4-4 3 3 5-6" />,
  menu: <path {...traco} d="M3 5h12M3 9h12M3 13h12" />,
  recolher: <path {...traco} d="M11 4L6 9l5 5" />,
};


const TITULOS: Record<Modulo, string> = {
  regimes: 'Regimes na Reforma', 'st-difal': 'ST e DIFAL', beneficios: 'Benefícios fiscais', relatorio: 'Relatório',
};

/** Dentro de um iframe (ex.: página publicada) a impressão costuma ser bloqueada. */
const podeImprimir = (() => { try { return window.self === window.top; } catch { return false; } })();

const lerHash = (): Modulo => {
  const h = window.location.hash.replace('#', '');
  return h in TITULOS ? (h as Modulo) : 'regimes';
};

export function App() {
  const [modulo, setModulo] = useState<Modulo>(lerHash);
  const [etapa, setEtapa] = useState<EtapaRegimes>('dados');
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhido, setRecolhido] = usePersistente('simulador-reforma:menu-recolhido', () => false, (v): v is boolean => typeof v === 'boolean');
  // Um cadastro da empresa para todos os módulos
  const [empresa, setEmpresa] = usePersistente('simulador-reforma:entrada:v3', entradaInicial, entradaValida);
  const [operacao, setOperacao] = usePersistente('simulador-reforma:operacao:v1', () => OPERACAO_PADRAO, operacaoValida);
  const [filtro, setFiltro] = usePersistente('simulador-reforma:beneficios:v1', () => FILTRO_PADRAO, filtroValido);
  const valido = validar(empresa).erros.length === 0;

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
  const ir = (m: Modulo, e?: EtapaRegimes) => {
    setModulo(m);
    if (e) setEtapa(e);
    setMenuAberto(false);
    try { history.replaceState(null, '', `#${m}`); } catch { /* ignora */ }
    window.scrollTo({ top: 0 });
  };

  const regime = NOMES_REGIME[empresa.regimeAtual].nome.replace('Simples Unificado', 'Simples Nacional');
  const migalha = modulo === 'regimes' ? (etapa === 'dados' ? 'Dados da empresa' : 'Análise') : null;

  const item = (m: Modulo, rotulo: string, icone: ReactNode) => (
    <button type="button" className={`nav-item ${modulo === m ? 'on' : ''}`} aria-current={modulo === m ? 'page' : undefined}
      title={recolhido ? rotulo : undefined} onClick={() => ir(m, m === 'regimes' ? etapa : undefined)}>
      <Icone>{icone}</Icone><span className="nav-rotulo">{rotulo}</span>
    </button>
  );

  return (
    <div className={`app-shell ${recolhido ? 'recolhido' : ''} ${menuAberto ? 'menu-aberto' : ''}`}>
      <aside className="lateral" aria-label="Navegação">
        <div className="lateral-marca">
          <svg viewBox="0 0 28 28" width="30" height="30" aria-hidden="true">
            <rect width="28" height="28" rx="7" className="marca-fundo-lateral" />
            <rect x="7" y="14" width="3.2" height="7" rx="1" fill="#9fc0e6" />
            <rect x="12.4" y="10" width="3.2" height="11" rx="1" fill="#9fc0e6" />
            <rect x="17.8" y="6.5" width="3.2" height="14.5" rx="1" fill="#ffffff" />
          </svg>
          <div className="nav-rotulo">
            <b>Simulador Tributário</b>
            <span>Análise na Reforma</span>
          </div>
        </div>

        <nav className="lateral-nav">
          <p className="nav-grupo">Análises</p>
          {item('regimes', 'Regimes na Reforma', ICONES.regimes)}
          {modulo === 'regimes' && !recolhido && (
            <div className="nav-sub">
              <button type="button" className={etapa === 'dados' ? 'on' : ''} onClick={() => ir('regimes', 'dados')}>
                <Icone>{ICONES.dados}</Icone>Dados da empresa
              </button>
              <button type="button" className={etapa === 'analise' ? 'on' : ''} disabled={!valido} onClick={() => ir('regimes', 'analise')}>
                <Icone>{ICONES.analise}</Icone>Análise
              </button>
            </div>
          )}
          {item('st-difal', 'ST e DIFAL', ICONES['st-difal'])}
          {item('beneficios', 'Benefícios fiscais', ICONES.beneficios)}
          <p className="nav-grupo">Documentos</p>
          {item('relatorio', 'Relatório completo', ICONES.relatorio)}
        </nav>

        <div className="lateral-rodape">
          <p className="nav-rotulo">LC 214/2025 · parâmetros de {VERSAO_PARAMETROS.split('-').reverse().join('/')}</p>
          <button type="button" className="lateral-recolher" onClick={() => setRecolhido(!recolhido)}
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'} title={recolhido ? 'Expandir menu' : 'Recolher menu'}>
            <Icone>{ICONES.recolher}</Icone>
          </button>
        </div>
      </aside>
      <button type="button" className="lateral-fundo" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />

      <div className="principal-shell">
        <header className="topo-pagina">
          <button type="button" className="botao-menu" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>
            <Icone>{ICONES.menu}</Icone>
          </button>
          <nav className="migalhas" aria-label="Você está em">
            <span>{empresa.nomeEmpresa?.trim() || 'Sua empresa'}</span>
            <span aria-hidden="true">/</span>
            <b>{TITULOS[modulo]}</b>
            {migalha && <><span aria-hidden="true">/</span><b>{migalha}</b></>}
          </nav>
          <span className="topo-info">{NOMES_UF[empresa.uf]} · {regime}</span>
        </header>

        <main className="conteudo">
          {modulo === 'regimes' && (
            <ModuloRegimes entrada={empresa} onChange={setEmpresa} onExemplo={aplicarExemplo} etapa={etapa} onEtapa={setEtapa} />
          )}
          {modulo === 'st-difal' && <ModuloIcms empresa={empresa} op={operacao} onOp={setOperacao} />}
          {modulo === 'beneficios' && (
            <ModuloBeneficios empresa={empresa} op={operacao} onOp={setOperacao} filtro={filtro} onFiltro={setFiltro} />
          )}
          {modulo === 'relatorio' && <ModuloRelatorio empresa={empresa} op={operacao} filtro={filtro} onIr={(m) => ir(m, m === 'regimes' && valido ? 'analise' : undefined)} podeImprimir={podeImprimir} />}
        </main>

        <footer className="rodape">
          Estimativas com base na legislação vigente e nas premissas informadas. Não substituem a análise de um contador.
        </footer>
      </div>
    </div>
  );
}
