import { useMemo } from 'react';
import { NOMES_UF, PERFIS, UFS, aliquotaInterestadual, avaliarBeneficios, type AvaliacaoBeneficio, type Entrada, type PerfilOperacao } from '../motor';
import { Campo, CampoNumero, Icone, Painel, Segmentado } from './campos';
import { icmsDaEmpresa, type FiltroBeneficios, type OperacaoIcms } from './estado';
import { brl, pct } from './formato';

export function ModuloBeneficios({ empresa, op, onOp, filtro, onFiltro, onIrIcms }: {
  empresa: Entrada; op: OperacaoIcms; onOp: (o: OperacaoIcms) => void;
  filtro: FiltroBeneficios; onFiltro: (f: FiltroBeneficios) => void; onIrIcms: () => void;
}) {
  const icms = icmsDaEmpresa(empresa, op);
  const avaliacoes = useMemo(() => avaliarBeneficios({
    perfis: filtro.perfis, volume: op.valor, ufOrigem: icms.ufOrigem, ufDestino: op.ufDestino,
    vendedorSimples: icms.vendedorSimples, importado: op.importado,
  }), [filtro.perfis, op.valor, op.ufDestino, op.importado, icms.ufOrigem, icms.vendedorSimples]);

  const aderentes = avaliacoes.filter((a) => a.aderente);
  const outros = avaliacoes.filter((a) => !a.aderente);
  const melhor = aderentes.find((a) => a.economia !== null && a.economia > 0);
  const aliqHoje = aliquotaInterestadual(icms.ufOrigem, op.ufDestino, op.importado);
  const alternar = (p: PerfilOperacao) => onFiltro({
    perfis: filtro.perfis.includes(p) ? filtro.perfis.filter((x) => x !== p) : [...filtro.perfis, p],
  });

  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <p className="sobretitulo">Incentivos estaduais de ICMS</p>
        <h1>Buscador de benefícios fiscais</h1>
        <p>Benefícios de ICMS ligados ao jeito que sua empresa vende, com a carga de referência, os requisitos e quanto daria de economia nas vendas para outros estados.</p>
      </div>

      <div className="grade-icms">
        <aside className="icms-form">
          <section className="enq-cartao">
            <h2>Seu perfil</h2>
            <fieldset className="campo">
              <legend className="rotulo">Como sua empresa opera</legend>
              <div className="opcoes-lista">
                {PERFIS.map((p) => (
                  <label key={p.id} className={`opcao ${filtro.perfis.includes(p.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={filtro.perfis.includes(p.id)} onChange={() => alternar(p.id)} />
                    <span><b>{p.rotulo}</b><small>{p.desc}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Campo id="b-vol" rotulo="Vendas para outros estados por mês" ajuda="Usado para estimar a economia. É o mesmo valor do módulo de ST e DIFAL.">
              <CampoNumero id="b-vol" prefixo="R$" valor={op.valor} onChange={(v) => onOp({ ...op, valor: v })} />
            </Campo>
            <Campo id="b-dest" rotulo="Principal estado de destino">
              <select id="b-dest" value={op.ufDestino} onChange={(ev) => onOp({ ...op, ufDestino: ev.target.value, internaDestino: undefined, fcpDestino: undefined })}>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf} · {NOMES_UF[uf]}</option>)}
              </select>
            </Campo>
            <div className="campo">
              <span className="rotulo">Origem do produto</span>
              <Segmentado rotulo="Origem do produto" valor={op.importado ? 'i' : 'n'} onChange={(v) => onOp({ ...op, importado: v === 'i' })}
                opcoes={[{ valor: 'n', rotulo: 'Nacional' }, { valor: 'i', rotulo: 'Importado' }]} />
            </div>
            <dl className="enq-lista">
              <div><dt>Sua empresa hoje</dt><dd>{icms.ufOrigem} · {icms.vendedorSimples ? 'Simples' : 'Presumido ou Real'}</dd></div>
            </dl>
            <button type="button" className="botao fantasma pequeno" onClick={onIrIcms}>Ver ICMS por estado</button>
          </section>
        </aside>

        <div className="icms-resultados">
          <section className="resumo icms-resumo" aria-labelledby="t-ben">
            <div className="recomendacao">
              <p className="sobretitulo">Resultado da busca</p>
              <h2 id="t-ben">{aderentes.length ? `${aderentes.length} ${aderentes.length > 1 ? 'benefícios combinam' : 'benefício combina'} com seu perfil` : 'Marque como sua empresa opera'}</h2>
              <ul>
                <li>{melhor ? `Maior economia estimada: ${melhor.b.nome} (${melhor.b.uf}).` : icms.vendedorSimples ? 'No Simples, o ICMS está no DAS: os benefícios exigem Lucro Presumido ou Real.' : 'Nenhum benefício com economia quantificada para este perfil e destino.'}</li>
                <li>A economia compara só o ICMS de origem. O DIFAL do destino não muda.</li>
              </ul>
            </div>
            <div className="kpis">
              <div className="kpi">
                <span className="kpi-rotulo">ICMS de origem hoje</span>
                <span className="kpi-valor">{icms.vendedorSimples ? 'No DAS' : op.ufDestino === icms.ufOrigem ? '—' : brl(op.valor * aliqHoje)}</span>
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
                <span className="kpi-nota">{melhor ? `${brl(melhor.economia! * 12)} por ano` : ''}</span>
              </div>
              <div className="kpi">
                <span className="kpi-rotulo">Prazo dos benefícios</span>
                <span className="kpi-valor texto">Até 2032</span>
                <span className="kpi-nota">O ICMS acaba em 2033 (EC 132/2023)</span>
              </div>
            </div>
          </section>

          <Painel titulo="Benefícios para o seu perfil" subtitulo="Ordenados pela economia estimada">
            {aderentes.length === 0
              ? <p className="nota">Marque ao menos uma forma de operação para ver os benefícios.</p>
              : <div className="beneficios">{aderentes.map((a) => <CartaoBeneficio key={a.b.id} a={a} simples={icms.vendedorSimples} />)}</div>}
          </Painel>

          {outros.length > 0 && (
            <Painel titulo="Outros benefícios do catálogo" subtitulo="Não combinam com o perfil marcado">
              <ul className="outros-beneficios">
                {outros.map((a) => (
                  <li key={a.b.id}><span className="uf-tag">{a.b.uf}</span><b>{a.b.nome}</b><span>{a.b.operacao}</span></li>
                ))}
              </ul>
            </Painel>
          )}

          <Painel titulo="Como ler este resultado" subtitulo="Leia antes de decidir">
            <ul className="atencao">
              <li className="sev-atencao"><Icone tipo="atencao" /><div><b>Levantamento inicial, a validar</b><p>Catálogo com {avaliacoes.length} benefícios em 6 estados, montado com legislação e materiais técnicos de outubro de 2026. Percentuais e requisitos precisam ser confirmados com um contador e no termo de concessão.</p></div></li>
              <li className="sev-info"><Icone tipo="info" /><div><b>A economia é só no ICMS de origem</b><p>Na venda a consumidor final, o DIFAL continua indo para o destino. Abrir filial em outro estado também tem custos (estrutura, logística, obrigações) que não estão na conta.</p></div></li>
              <li className="sev-info"><Icone tipo="info" /><div><b>Fim na Reforma</b><p>Os benefícios de ICMS terminam até 2032. Os convalidados pela LC 160/2017 podem ter compensação pelo fundo previsto na EC 132/2023.</p></div></li>
            </ul>
          </Painel>
        </div>
      </div>
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
        <span className="selo">Confirmar com contador</span>
      </header>
      <p className="beneficio-op">{b.operacao}</p>
      <div className="beneficio-numeros">
        <div>
          <span className="kpi-rotulo">Carga de referência</span>
          <p>{b.cargaTexto}</p>
        </div>
        <div className={`beneficio-economia ${a.economia ? 'tem' : ''}`}>
          <span className="kpi-rotulo">Economia estimada</span>
          {a.economia !== null ? (
            <>
              <b>{brl(a.economia)}<small>/mês</small></b>
              <span>ICMS de origem: {brl(a.icmsHoje!)} → {brl(a.icmsComBeneficio!)}</span>
            </>
          ) : <span>{!b.carga ? 'Percentual ainda não confirmado' : simples ? 'Calculada só para Lucro Presumido ou Real' : 'Sem venda interestadual neste cenário'}</span>}
        </div>
      </div>
      {a.alertas.length > 0 && (
        <ul className="beneficio-alertas">{a.alertas.map((t) => <li key={t}><Icone tipo="atencao" />{t}</li>)}</ul>
      )}
      <div className="beneficio-detalhes">
        <div><h4>Requisitos</h4><ul>{b.requisitos.map((r) => <li key={r}>{r}</li>)}</ul></div>
        <div><h4>Cuidados</h4><ul>{b.cuidados.map((r) => <li key={r}>{r}</li>)}</ul></div>
      </div>
      <footer className="beneficio-rodape">
        <span><b>Base legal:</b> {b.baseLegal}</span>
        <a href={b.fonte.url} target="_blank" rel="noopener noreferrer">{b.fonte.rotulo} ↗</a>
      </footer>
    </article>
  );
}
