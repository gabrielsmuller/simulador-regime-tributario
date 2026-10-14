import { ATIVIDADES, NOMES_REGIME, NOMES_UF, type Entrada } from '../motor';
import { brl } from './formato';

/** Identifica a empresa analisada em todos os módulos; os dados se editam num lugar só. */
export function BarraEmpresa({ empresa, onEditar }: { empresa: Entrada; onEditar: () => void }) {
  const regime = NOMES_REGIME[empresa.regimeAtual].nome.replace('Simples Unificado', 'Simples Nacional');
  return (
    <div className="barra-empresa">
      <div className="empresa-id">
        <span className="empresa-avatar" aria-hidden="true">{(empresa.nomeEmpresa?.trim() || 'E').charAt(0).toUpperCase()}</span>
        <div>
          <b>{empresa.nomeEmpresa?.trim() || 'Sua empresa'}</b>
          <span>{ATIVIDADES[empresa.atividade].nome} · {NOMES_UF[empresa.uf]} · {regime} · {brl(empresa.faturamentoMensal)}/mês</span>
        </div>
      </div>
      <button type="button" className="botao secundario pequeno" onClick={onEditar}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L6 12l-3 1 1-3z" /></svg>
        Editar dados da empresa
      </button>
    </div>
  );
}
