import { useMemo } from 'react';
import { NOMES_UF, PERFIS, UFS, aliquotaInterestadual, avaliarBeneficios, type AvaliacaoBeneficio, type Entrada, type PerfilOperacao } from '../motor';
import { CampoNumero, Icone, Painel, Segmentado } from './campos';
import { icmsDaEmpresa, type FiltroBeneficios, type OperacaoIcms } from './estado';
import { brl, pct } from './formato';

export function ModuloBeneficios({ empresa, op, onOp, filtro, onFiltro }: {
  empresa: Entrada; op: OperacaoIcms; onOp: (o: OperacaoIcms) => void;
  filtro: FiltroBeneficios; onFiltro: (f: FiltroBeneficios) => void;
}) {
  const icms = icmsDaEmpresa(empresa, op);
  const avaliacoes = useMemo(() => avaliarBeneficios({
    perfis: filtro.perfis, volume: op.valor, ufOrigem: icms.ufOrigem, ufDestino: op.ufDestino,
    vendedorSimples: icms.vendedorSimples, importado: op.importado,
  }), [filtro.perfis, op.valor, op.ufDestino, op.importado, icms.ufOrigem, icms.vendedorSimples]);

  const aderentes = avaliacoes.filter((a) => a.aderente);
  const outros = avaliacoes.filter((a) => !a.aderente);
  const comValor = aderentes.filter((a) => a.economia !== null && a.economia > 0);
  const melhor = comValor[0];
  const aliqHoje = aliquotaInterestadual(icms.ufOrigem, op.ufDestino, op.importado);
  const icmsHoje = op.valor * aliqHoje;
  const alternar = (p: PerfilOperacao) => onFiltro({
    perfis: filtro.perfis.includes(p) ? filtro.perfis.filter((x) => x !== p) : [...filtro.perfis, p],
  });

  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <h1>Benefícios fiscais</h1>
        <p>Incentivos estaduais de ICMS ligados ao jeito que sua empresa vende.</p>
      </div>

      <section className="barra-parametros" aria-label="Perfil para a busca">
        <div className="parametros">
          <div className="parametro largo">
            <span>Como sua empresa opera</span>
            <div className="chips" role="group" aria-label="Como sua empresa opera">
              {PERFIS.map((p) => (
                <button key={p.id} type="button" className={`chip ${filtro.perfis.includes(p.id) ? 'on' : ''}`}
                  aria-pressed={filtro.perfis.includes(p.id)} onClick={() => alternar(p.id)} title={p.desc}>
                  {filtro.perfis.includes(p.id) && <Icone tipo="ok" />}{p.rotulo}
                </button>
              ))}
            </div>
          </div>
          <label className="parametro">
            <span>Destino principal</span>
            <select value={op.ufDestino} onChange={(ev) => onOp({ ...op, ufDestino: ev.target.value, internaDestino: undefined, fcpDestino: undefined })}>
              {UFS.map((uf) => <option key={uf} value={uf}>{NOMES_UF[uf]}</option>)}
            </select>
          </label>
          <label className="parametro">
            <span>Vendas para fora por mês</span>
            <CampoNumero id="b-vol" prefixo="R$" casas={0} valor={op.valor} onChange={(v) => onOp({ ...op, valor: v })} />
          </label>
          <div className="parametro">
            <span>Produto</span>
            <Segmentado rotulo="Origem do produto" valor={op.importado ? 'i' : 'n'} onChange={(v) => onOp({ ...op, importado: v === 'i' })}
              opcoes={[{ valor: 'n', rotulo: 'Nacional' }, { valor: 'i', rotulo: 'Importado' }]} />
          </div>
        </div>
      </section>

      <section className="resumo icms-resumo" aria-labelledby="t-ben">
        <div className="recomendacao">
          <p className="sobretitulo">Resultado</p>
          <h2 id="t-ben">{aderentes.length ? `${aderentes.length} ${aderentes.length > 1 ? 'benefícios' : 'benefício'} para o seu perfil` : 'Marque como sua empresa opera'}</h2>
          <p className="rec-nota">
            {icms.vendedorSimples ? 'No Simples, o ICMS está no DAS: estes benefícios exigem Lucro Presumido ou Real.'
              : melhor ? `Maior economia com ${melhor.b.nome.split(' · ')[0]}, em ${NOMES_UF[melhor.b.uf]}.` : 'Nenhuma economia quantificada para este destino.'}
          </p>
        </div>
        <div className="kpis tres">
          <div className="kpi">
            <span className="kpi-rotulo">ICMS de origem hoje</span>
            <span className="kpi-valor">{icms.vendedorSimples ? 'No DAS' : op.ufDestino === icms.ufOrigem ? '—' : brl(icmsHoje)}</span>
            <span className="kpi-nota">{icms.ufOrigem} → {op.ufDestino}{!icms.vendedorSimples && op.ufDestino !== icms.ufOrigem ? ` · ${pct(aliqHoje, 0)}` : ''}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">Com o melhor benefício</span>
            <span className="kpi-valor">{melhor ? brl(melhor.icmsComBeneficio!) : '—'}</span>
            <span className="kpi-nota">{melhor ? `${melhor.b.uf} · carga de ${pct(melhor.cargaBeneficio!, 1)}` : 'Sem estimativa'}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">Economia estimada</span>
            <span className={`kpi-valor ${melhor ? 'bom' : ''}`}>{melhor ? brl(melhor.economia!) : '—'}<small>{melhor ? '/mês' : ''}</small></span>
            <span className="kpi-nota">{melhor ? `${brl(melhor.economia! * 12)} por ano, até 2032` : ''}</span>
          </div>
        </div>
      </section>

      {comValor.length > 0 && (
        <Painel titulo="ICMS de origem com cada benefício" subtitulo={`Vendas de ${brl(op.valor)}/mês para ${NOMES_UF[op.ufDestino]}. Cada benefício exige estabelecimento no estado dele; o DIFAL do destino não muda.`}>
          <div className="comparativo-beneficios">
            <div className="barra-credito hoje">
              <span className="barra-nome">Hoje, saindo de {icms.ufOrigem}</span>
              <span className="barra-trilho"><span className="barra-cheia" style={{ width: '100%' }} /></span>
              <span className="barra-total">{brl(comValor[0].icmsHoje!)}</span>
            </div>
            {comValor.map((a) => (
              <div key={a.b.id} className="barra-credito">
                <span className="barra-nome"><span className="uf-tag pequena">{a.b.uf}</span>{a.b.nome.split(' · ')[0]}</span>
                <span className="barra-trilho"><span className="barra-cheia beneficio-cor" style={{ width: `${(a.icmsComBeneficio! / a.icmsHoje!) * 100}%` }} /></span>
                <span className="barra-total">{brl(a.icmsComBeneficio!)} <em>−{brl(a.economia!)}</em></span>
              </div>
            ))}
          </div>
        </Painel>
      )}

      {aderentes.length > 0 && (
        <div className="beneficios">
          {aderentes.map((a) => <CartaoBeneficio key={a.b.id} a={a} simples={icms.vendedorSimples} />)}
        </div>
      )}

      {outros.length > 0 && (
        <details className="painel outros">
          <summary>Outros {outros.length} benefícios do catálogo, para outros perfis</summary>
          <ul className="outros-beneficios">
            {outros.map((a) => (
              <li key={a.b.id}><span className="uf-tag">{a.b.uf}</span><b>{a.b.nome}</b><span>{a.b.operacao}</span></li>
            ))}
          </ul>
        </details>
      )}

      <p className="nota aviso">
        Levantamento inicial de {avaliacoes.length} benefícios em 6 estados (outubro de 2026), a confirmar com um contador e no termo de concessão.
        A economia considera só o ICMS de origem, sem custos de filial ou contrapartidas. Os benefícios de ICMS terminam até 2032.
      </p>
    </div>
  );
}

function CartaoBeneficio({ a, simples }: { a: AvaliacaoBeneficio; simples: boolean }) {
  const { b } = a;
  return (
    <article className="beneficio">
      <header className="beneficio-topo">
        <span className="uf-tag">{b.uf}</span>
        <div>
          <h3>{b.nome}</h3>
          <p>{NOMES_UF[b.uf]} · {b.tipo}</p>
        </div>
        {a.economia !== null && a.economia > 0
          ? <span className="economia-selo">−{brl(a.economia)}<small>/mês</small></span>
          : <span className="economia-selo vazio">{!b.carga ? 'A confirmar' : simples ? 'Fora do Simples' : '—'}</span>}
      </header>
      <p className="beneficio-op">{b.operacao}</p>
      <p className="beneficio-carga"><b>Carga de referência:</b> {b.cargaTexto}</p>
      {/* A exigência de filial no estado vale para todos e aparece uma vez, no comparativo */}
      {a.alertas.filter((t) => !t.startsWith('Exige estabelecimento')).length > 0 && (
        <ul className="beneficio-alertas">{a.alertas.filter((t) => !t.startsWith('Exige estabelecimento')).map((t) => <li key={t}><Icone tipo="atencao" />{t}</li>)}</ul>
      )}
      <details className="beneficio-detalhes">
        <summary>Requisitos, cuidados e base legal</summary>
        <div className="beneficio-colunas">
          <div><h4>Requisitos</h4><ul>{b.requisitos.map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div><h4>Cuidados</h4><ul>{b.cuidados.map((r) => <li key={r}>{r}</li>)}</ul></div>
        </div>
        <footer className="beneficio-rodape">
          <span><b>Base legal:</b> {b.baseLegal}</span>
          <a href={b.fonte.url} target="_blank" rel="noopener noreferrer">{b.fonte.rotulo} ↗</a>
        </footer>
      </details>
    </article>
  );
}
