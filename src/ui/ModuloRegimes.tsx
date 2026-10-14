import { useEffect, useMemo, useState } from 'react';
import { simular, type Entrada } from '../motor';
import { validar } from './diagnostico';
import { EtapaAnalise } from './EtapaAnalise';
import { EtapaDados } from './EtapaDados';

type Etapa = 'dados' | 'analise';

export function ModuloRegimes({ entrada, onChange, podeImprimir }: {
  entrada: Entrada; onChange: (e: Entrada) => void; podeImprimir: boolean;
}) {
  const [etapa, setEtapa] = useState<Etapa>('dados');
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
        <EtapaDados entrada={entrada} onChange={onChange} onAvancar={() => setEtapa('analise')} />
      ) : (
        <EtapaAnalise entrada={entrada} resultado={resultado} onEditar={() => setEtapa('dados')} podeImprimir={podeImprimir} />
      )}
    </>
  );
}
