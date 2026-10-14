import { useEffect, useState } from 'react';
import { ModuloIcms } from './icms/ModuloIcms';
import { ModuloBeneficios } from './ModuloBeneficios';
import { ModuloRegimes } from './ModuloRegimes';

type Modulo = 'regimes' | 'st-difal' | 'beneficios';

const MODULOS: { id: Modulo; rotulo: string; sub: string; emBreve?: boolean }[] = [
  { id: 'regimes', rotulo: 'Regimes na Reforma', sub: 'Simples, Presumido e Real até 2033' },
  { id: 'st-difal', rotulo: 'ST e DIFAL', sub: 'ICMS nas vendas para outros estados' },
  { id: 'beneficios', rotulo: 'Benefícios fiscais', sub: 'Incentivos estaduais', emBreve: true },
];

/** Dentro de um iframe (ex.: página publicada) a impressão costuma ser bloqueada. */
const podeImprimir = (() => { try { return window.self === window.top; } catch { return false; } })();

const lerHash = (): Modulo => {
  const h = window.location.hash.replace('#', '');
  return MODULOS.some((m) => m.id === h) ? (h as Modulo) : 'regimes';
};

export function App() {
  const [modulo, setModulo] = useState<Modulo>(lerHash);
  useEffect(() => {
    const ouvir = () => setModulo(lerHash());
    window.addEventListener('hashchange', ouvir);
    return () => window.removeEventListener('hashchange', ouvir);
  }, []);
  const ir = (m: Modulo) => {
    setModulo(m);
    try { history.replaceState(null, '', `#${m}`); } catch { /* ignora */ }
    window.scrollTo({ top: 0 });
  };

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
                {m.rotulo}
                {m.emBreve && <span className="tag">em breve</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="conteudo">
        {modulo === 'regimes' && <ModuloRegimes podeImprimir={podeImprimir} />}
        {modulo === 'st-difal' && <ModuloIcms />}
        {modulo === 'beneficios' && <ModuloBeneficios onIr={() => ir('st-difal')} />}
      </main>

      <footer className="rodape">
        Estimativas com base na legislação vigente e nas premissas informadas. Não substituem a análise de um contador.
      </footer>
    </div>
  );
}
