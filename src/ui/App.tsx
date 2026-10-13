import { useEffect, useMemo, useState } from 'react';
import { ATIVIDADES, simular, type Entrada } from '../motor';
import { validar } from './diagnostico';
import { EtapaAnalise } from './EtapaAnalise';
import { EtapaDados } from './EtapaDados';
import { EXEMPLOS } from './exemplos';

const CHAVE = 'simulador-reforma:entrada:v3';
type Etapa = 'dados' | 'analise';

/** Dentro de um iframe (ex.: página publicada) a impressão costuma ser bloqueada. */
const podeImprimir = (() => { try { return window.self === window.top; } catch { return false; } })();

const EXEMPLO: Entrada = EXEMPLOS[0].entrada;

function carregar(): Entrada {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) {
      const e = JSON.parse(salvo) as Entrada;
      if (e && e.avancado && e.atividade in ATIVIDADES) return e;
    }
  } catch { /* sem armazenamento: usa o exemplo */ }
  return EXEMPLO;
}

export function App() {
  const [entrada, setEntrada] = useState<Entrada>(carregar);
  const [etapa, setEtapa] = useState<Etapa>('dados');
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(entrada)); } catch { /* ignora */ } }, [entrada]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [etapa]);

  const valido = validar(entrada).erros.length === 0;
  const resultado = useMemo(() => (valido ? simular(entrada) : null), [entrada, valido]);

  const passos: { id: Etapa; rotulo: string }[] = [
    { id: 'dados', rotulo: 'Dados da empresa' },
    { id: 'analise', rotulo: 'Análise' },
  ];

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
              <span className="marca-sub">Reforma Tributária · 2027–2033</span>
            </div>
          </div>
          <nav className="passos" aria-label="Etapas">
            {passos.map((p, i) => (
              <button key={p.id} type="button" className={`passo ${etapa === p.id ? 'on' : ''}`}
                aria-current={etapa === p.id ? 'step' : undefined}
                disabled={p.id === 'analise' && !valido} onClick={() => setEtapa(p.id)}>
                <span className="passo-num">{i + 1}</span>{p.rotulo}
              </button>
            ))}
          </nav>
          <span className="base-legal">LC 214/2025</span>
        </div>
      </header>

      <main className="conteudo">
        {etapa === 'dados' || !resultado ? (
          <EtapaDados entrada={entrada} onChange={setEntrada} onAvancar={() => setEtapa('analise')} />
        ) : (
          <EtapaAnalise entrada={entrada} resultado={resultado} onEditar={() => setEtapa('dados')} podeImprimir={podeImprimir} />
        )}
      </main>

      <footer className="rodape">
        Estimativa com base na LC 214/2025 e nas premissas informadas. Não substitui a análise de um contador.
      </footer>
    </div>
  );
}
