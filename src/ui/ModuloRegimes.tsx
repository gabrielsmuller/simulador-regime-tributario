import { useEffect, useMemo, useState } from 'react';
import { ATIVIDADES, simular, type Entrada } from '../motor';
import { validar } from './diagnostico';
import { EtapaAnalise } from './EtapaAnalise';
import { EtapaDados } from './EtapaDados';
import { EXEMPLOS } from './exemplos';

const CHAVE = 'simulador-reforma:entrada:v3';
type Etapa = 'dados' | 'analise';

function carregar(): Entrada {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) {
      const e = JSON.parse(salvo) as Entrada;
      if (e && e.avancado && e.atividade in ATIVIDADES) return e;
    }
  } catch { /* sem armazenamento: usa o exemplo */ }
  return EXEMPLOS[0].entrada;
}

export function ModuloRegimes({ podeImprimir }: { podeImprimir: boolean }) {
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
    <>
      <nav className="passos" aria-label="Etapas">
        {passos.map((p, i) => (
          <button key={p.id} type="button" className={`passo ${etapa === p.id ? 'on' : ''}`}
            aria-current={etapa === p.id ? 'step' : undefined}
            disabled={p.id === 'analise' && !valido} onClick={() => setEtapa(p.id)}>
            <span className="passo-num">{i + 1}</span>{p.rotulo}
          </button>
        ))}
      </nav>
      {etapa === 'dados' || !resultado ? (
        <EtapaDados entrada={entrada} onChange={setEntrada} onAvancar={() => setEtapa('analise')} />
      ) : (
        <EtapaAnalise entrada={entrada} resultado={resultado} onEditar={() => setEtapa('dados')} podeImprimir={podeImprimir} />
      )}
    </>
  );
}
