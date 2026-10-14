import { useEffect, useMemo } from 'react';
import { simular, type Entrada } from '../motor';
import { validar } from './diagnostico';
import { EtapaAnalise } from './EtapaAnalise';
import { EtapaDados } from './EtapaDados';
import type { Exemplo } from './exemplos';

export type EtapaRegimes = 'dados' | 'analise';

export function ModuloRegimes({ entrada, onChange, onExemplo, etapa, onEtapa }: {
  entrada: Entrada; onChange: (e: Entrada) => void; onExemplo: (x: Exemplo) => void;
  etapa: EtapaRegimes; onEtapa: (e: EtapaRegimes) => void;
}) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, [etapa]);
  const valido = validar(entrada).erros.length === 0;
  const resultado = useMemo(() => (valido ? simular(entrada) : null), [entrada, valido]);

  return etapa === 'dados' || !resultado
    ? <EtapaDados entrada={entrada} onChange={onChange} onExemplo={onExemplo} onAvancar={() => onEtapa('analise')} />
    : <EtapaAnalise entrada={entrada} resultado={resultado} />;
}
