import { useEffect, useState } from 'react';
import { ATIVIDADES, ICMS_INTERNA, type EntradaIcms, type Entrada, type PerfilOperacao } from '../motor';
import { EXEMPLOS } from './exemplos';

/** Estado salvo no navegador. Falha em silêncio quando não há armazenamento. */
export function usePersistente<T>(chave: string, inicial: () => T, valido: (v: unknown) => v is T) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const s = localStorage.getItem(chave);
      if (s) { const v = JSON.parse(s); if (valido(v)) return v; }
    } catch { /* sem armazenamento */ }
    return inicial();
  });
  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* ignora */ } }, [chave, valor]);
  return [valor, setValor] as const;
}

export const entradaValida = (v: unknown): v is Entrada =>
  !!v && typeof v === 'object' && 'avancado' in v && (v as Entrada).atividade in ATIVIDADES;

/** Parte do ICMS que é só do módulo de ST e DIFAL. Origem e regime vêm do cadastro da empresa. */
export type OperacaoIcms = Omit<EntradaIcms, 'ufOrigem' | 'vendedorSimples'>;

export const OPERACAO_PADRAO: OperacaoIcms = {
  ufDestino: 'BA', tipoCliente: 'nao_contribuinte', importado: false, temSt: false, mvaOriginal: 0.4,
  valor: 20_000, metodoDifal: 'dupla', difalNoSimples: false,
};

export const operacaoValida = (v: unknown): v is OperacaoIcms =>
  !!v && typeof v === 'object' && (v as OperacaoIcms).ufDestino in ICMS_INTERNA;

export interface FiltroBeneficios { perfis: PerfilOperacao[] }
export const FILTRO_PADRAO: FiltroBeneficios = { perfis: ['ecommerce'] };
export const filtroValido = (v: unknown): v is FiltroBeneficios => !!v && Array.isArray((v as FiltroBeneficios).perfis);

export const entradaInicial = () => EXEMPLOS[0].entrada;

/** Junta o cadastro da empresa com a operação do módulo de ICMS. */
export const icmsDaEmpresa = (e: Entrada, op: OperacaoIcms): EntradaIcms => ({
  ...op, ufOrigem: e.uf, vendedorSimples: e.regimeAtual === 'SN_UNIFICADO' || e.regimeAtual === 'SN_HIBRIDO',
});
