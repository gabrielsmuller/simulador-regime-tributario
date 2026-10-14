import {
  ATIVIDADES, AVANCADO_PADRAO, ICMS_UF, NOMES_REGIME, NOMES_UF, UFS, enquadramento,
  type AtividadeId, type Entrada, type Regime,
} from '../motor';
import { Campo, CampoNumero, Icone, Secao, Segmentado } from './campos';
import { validar } from './diagnostico';
import { EXEMPLOS, type Exemplo } from './exemplos';
import { brl, escreverNumero, pct } from './formato';

const REGIMES_HOJE: { valor: Regime; rotulo: string }[] = [
  { valor: 'SN_UNIFICADO', rotulo: 'Simples Nacional' },
  { valor: 'PRESUMIDO', rotulo: 'Lucro Presumido' },
  { valor: 'REAL', rotulo: 'Lucro Real' },
];

const proporcao = (v: number, fat: number) => (fat > 0 ? `${pct(v / fat, 1)} do faturamento` : '');

export function EtapaDados({ entrada, onChange, onAvancar, onExemplo }: {
  entrada: Entrada; onChange: (e: Entrada) => void; onAvancar: () => void; onExemplo?: (x: Exemplo) => void;
}) {
  const set = <K extends keyof Entrada>(k: K, v: Entrada[K]) => onChange({ ...entrada, [k]: v });
  const setAv = <K extends keyof Entrada['avancado']>(k: K, v: Entrada['avancado'][K]) =>
    onChange({ ...entrada, avancado: { ...entrada.avancado, [k]: v } });
  const ativ = ATIVIDADES[entrada.atividade];
  const fat = entrada.faturamentoMensal;
  const sugestaoCompras = Math.round(fat * ativ.comprasPadrao);
  const { erros, avisos } = validar(entrada);

  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <h1>Dados da empresa</h1>
        <p>Use médias mensais dos últimos 12 meses ou comece por um exemplo.</p>
      </div>

      <div className="exemplos" role="group" aria-label="Empresas de exemplo">
        <span className="exemplos-rotulo">Exemplos</span>
        {EXEMPLOS.map((x) => {
          const ativo = entrada.nomeEmpresa === x.entrada.nomeEmpresa;
          return (
            <button key={x.id} type="button" className={`exemplo ${ativo ? 'on' : ''}`} aria-pressed={ativo}
              onClick={() => (onExemplo ? onExemplo(x) : onChange(x.entrada))}>
              <b>{x.nome}</b><span>{x.resumo}</span>
            </button>
          );
        })}
      </div>

      <div className="form-largo">
          <Secao numero={1} titulo="Atividade principal"
            descricao="Define o anexo do Simples, a presunção do Lucro Presumido e as reduções de IBS/CBS.">
            <div className="atividades" role="radiogroup" aria-label="Atividade principal">
              {(Object.entries(ATIVIDADES) as [AtividadeId, typeof ativ][]).map(([id, a]) => {
                const sel = id === entrada.atividade;
                return (
                  <label key={id} className={`atividade ${sel ? 'on' : ''}`}>
                    <input type="radio" name="atividade" value={id} checked={sel}
                      onChange={() => onChange({ ...entrada, atividade: id, margemLucro: a.margemPadrao })} />
                    <span className="atividade-nome">{a.nome}</span>
                    <span className="atividade-ex">{a.exemplos}</span>
                    <span className="atividade-tags">
                      <span className="tag">{a.anexo === 'FATOR_R' ? 'Anexo III/V' : `Anexo ${a.anexo}`}</span>
                      <span className="tag">{a.tributoLocal}</span>
                      {a.reducaoIbsCbs > 0 && <span className="tag destaque">IBS/CBS −{pct(a.reducaoIbsCbs, 0)}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </Secao>

          <Secao numero={2} titulo="Empresa e regime atual">
            <div className="grade grade-2">
              <Campo id="f-nome" rotulo="Nome da empresa" extra="opcional" ajuda="Aparece no título da análise.">
                <input id="f-nome" className="entrada-texto" type="text" maxLength={80} placeholder="Ex.: Comercial Silva Ltda."
                  value={entrada.nomeEmpresa ?? ''} onChange={(ev) => set('nomeEmpresa', ev.target.value)} />
              </Campo>
              <Campo id="f-uf" rotulo="Estado">
                <select id="f-uf" value={entrada.uf}
                  onChange={(ev) => onChange({ ...entrada, uf: ev.target.value, avancado: { ...entrada.avancado, aliqIcms: ICMS_UF[ev.target.value] } })}>
                  {Object.keys(ICMS_UF).sort().map((uf) => <option key={uf}>{uf}</option>)}
                </select>
              </Campo>
              <div className="campo inteiro">
                <div className="campo-topo"><span className="rotulo" id="r-regime">Regime tributário hoje</span></div>
                <Segmentado rotulo="Regime tributário hoje" valor={entrada.regimeAtual} opcoes={REGIMES_HOJE}
                  onChange={(v) => set('regimeAtual', v)} />
                <p className="ajuda">Quem paga uma guia única (DAS) por mês está no Simples Nacional.</p>
              </div>
            </div>
          </Secao>

          <Secao numero={3} titulo="Números mensais" descricao="Valores médios por mês, sem centavos se preferir.">
            <div className="grade grade-2">
              <Campo id="f-fat" rotulo="Faturamento" ajuda={`${brl(fat * 12)} em 12 meses`}>
                <CampoNumero id="f-fat" prefixo="R$" valor={fat} onChange={(v) => set('faturamentoMensal', v)} />
              </Campo>
              <Campo id="f-folha" rotulo="Folha de pagamento" extra={proporcao(entrada.folhaMensal, fat)}
                ajuda="Salários + pró-labore dos sócios.">
                <CampoNumero id="f-folha" prefixo="R$" valor={entrada.folhaMensal} onChange={(v) => set('folhaMensal', v)} />
              </Campo>
              <Campo id="f-compras" rotulo="Compras de outras empresas" extra={proporcao(entrada.comprasMensais, fat)}
                ajuda={<>Mercadorias, insumos e serviços com nota.{' '}
                  <button type="button" className="link" onClick={() => set('comprasMensais', sugestaoCompras)}>
                    Usar média do setor (R$ {escreverNumero(sugestaoCompras, 0)})
                  </button></>}>
                <CampoNumero id="f-compras" prefixo="R$" valor={entrada.comprasMensais} onChange={(v) => set('comprasMensais', v)} />
              </Campo>
              <Campo id="f-margem" rotulo="Margem de lucro"
                extra={entrada.margemLucro === ativ.margemPadrao ? 'média do setor' : (
                  <button type="button" className="link" onClick={() => set('margemLucro', ativ.margemPadrao)}>
                    média do setor: {pct(ativ.margemPadrao, 0)}
                  </button>)}
                ajuda="Lucro antes do IR, a cada R$ 100 vendidos. Usada no Lucro Real.">
                <CampoNumero id="f-margem" sufixo="%" casas={1} percentual max={100} valor={entrada.margemLucro} onChange={(v) => set('margemLucro', v)} />
              </Campo>
            </div>
            <div className="campo faixa-b2b">
              <div className="campo-topo">
                <label htmlFor="f-b2b">Vendas para outras empresas</label>
                <span className="valor-b2b">{pct(entrada.percVendasEmpresas, 0)}</span>
              </div>
              <input id="f-b2b" type="range" min={0} max={100} step={5}
                value={Math.round(entrada.percVendasEmpresas * 100)}
                onChange={(ev) => set('percVendasEmpresas', Number(ev.target.value) / 100)} />
              <div className="escala"><span>Só consumidor final</span><span>Só empresas</span></div>
              {entrada.percVendasEmpresas > 0 && !ativ.creditoVedado && (
                <div className="subfaixa">
                  <div className="campo-topo">
                    <label htmlFor="f-cred">Desses clientes, quantos aproveitam crédito de IBS/CBS</label>
                    <span className="valor-b2b">{pct(entrada.percClientesComCredito ?? 1, 0)}</span>
                  </div>
                  <input id="f-cred" type="range" min={0} max={100} step={5}
                    value={Math.round((entrada.percClientesComCredito ?? 1) * 100)}
                    onChange={(ev) => set('percClientesComCredito', Number(ev.target.value) / 100)} />
                  <p className="ajuda">Clientes no Simples Unificado e MEIs não aproveitam. Na dúvida, deixe 100%.</p>
                </div>
              )}
            </div>
            {ativ.tributoLocal === 'ICMS' && (
              <div className="grade grade-2 bloco-interestadual">
                <div className="campo faixa-b2b">
                  <div className="campo-topo">
                    <label htmlFor="f-fora">Vendas a consumidor final de outros estados</label>
                    <span className="valor-b2b">{pct(entrada.percVendasOutrosEstados ?? 0, 0)}</span>
                  </div>
                  <input id="f-fora" type="range" min={0} max={100} step={5}
                    value={Math.round((entrada.percVendasOutrosEstados ?? 0) * 100)}
                    onChange={(ev) => set('percVendasOutrosEstados', Number(ev.target.value) / 100)} />
                  <p className="ajuda">E-commerce e vendas a distância. Fora do Simples, geram DIFAL para o destino.</p>
                </div>
                <Campo id="f-dest" rotulo="Principal estado de destino">
                  <select id="f-dest" value={entrada.ufDestinoPrincipal ?? ''} disabled={!(entrada.percVendasOutrosEstados ?? 0)}
                    onChange={(ev) => set('ufDestinoPrincipal', ev.target.value || undefined)}>
                    <option value="">Selecione</option>
                    {UFS.filter((uf) => uf !== entrada.uf).map((uf) => <option key={uf} value={uf}>{uf} · {NOMES_UF[uf]}</option>)}
                  </select>
                </Campo>
              </div>
            )}
          </Secao>

          <Secao numero={4} titulo="Premissas da Reforma" recolhivel
            descricao="Padrões com base na lei e nas estimativas oficiais. Ajuste para simular outro cenário."
            acao={<button type="button" className="botao fantasma pequeno"
              onClick={() => onChange({ ...entrada, avancado: { ...AVANCADO_PADRAO, aliqIcms: ICMS_UF[entrada.uf] } })}>
              Restaurar padrões</button>}>
            <div className="grade grade-3">
              <Campo id="f-cbs" rotulo="CBS (alíquota cheia)" ajuda="Estimativa CGIBS, 2026">
                <CampoNumero id="f-cbs" sufixo="%" percentual max={40} valor={entrada.avancado.aliqCbs} onChange={(v) => setAv('aliqCbs', v)} />
              </Campo>
              <Campo id="f-ibs" rotulo="IBS (alíquota cheia)" ajuda="Res. CGIBS nº 14/2026">
                <CampoNumero id="f-ibs" sufixo="%" percentual max={40} valor={entrada.avancado.aliqIbs} onChange={(v) => setAv('aliqIbs', v)} />
              </Campo>
              <Campo id="f-cresc" rotulo="Crescimento ao ano" ajuda="Aplicado à receita, folha e compras">
                <CampoNumero id="f-cresc" sufixo="%" casas={1} percentual max={100} valor={entrada.avancado.crescimentoAnual} onChange={(v) => setAv('crescimentoAnual', v)} />
              </Campo>
              <Campo id="f-icms" rotulo={`ICMS (${entrada.uf})`} ajuda="Alíquota modal interna">
                <CampoNumero id="f-icms" sufixo="%" percentual max={40} valor={entrada.avancado.aliqIcms} onChange={(v) => setAv('aliqIcms', v)} />
              </Campo>
              <Campo id="f-iss" rotulo="ISS do município" ajuda="Entre 2% e 5%">
                <CampoNumero id="f-iss" sufixo="%" percentual max={5} valor={entrada.avancado.aliqIss} onChange={(v) => setAv('aliqIss', v)} />
              </Campo>
              <Campo id="f-forn" rotulo="Fornecedores fora do Simples" ajuda="Só eles geram crédito integral">
                <CampoNumero id="f-forn" sufixo="%" casas={0} percentual max={100} valor={entrada.avancado.percFornecedoresRegular} onChange={(v) => setAv('percFornecedoresRegular', v)} />
              </Campo>
            </div>
          </Secao>
      </div>

      <BarraAcao entrada={entrada} erros={erros} avisos={avisos} onAvancar={onAvancar} />
    </div>
  );
}

/** Rodapé fixo e baixo: resumo do enquadramento e o botão de avançar. Nunca fica cortado. */
function BarraAcao({ entrada, erros, avisos, onAvancar }: {
  entrada: Entrada; erros: string[]; avisos: string[]; onAvancar: () => void;
}) {
  const enq = enquadramento(entrada, 2027);
  const regimes: [Regime, boolean][] = [
    ['SN_UNIFICADO', enq.simplesElegivel], ['SN_HIBRIDO', enq.simplesElegivel],
    ['PRESUMIDO', enq.presumidoElegivel], ['REAL', true],
  ];
  const disponiveis = regimes.filter(([, ok]) => ok).length;
  const alerta = erros[0] ?? avisos[0];
  return (
    <div className="barra-acao" role="region" aria-label="Enquadramento e próximo passo">
      <dl className="barra-acao-itens">
        <div><dt>Receita 12 meses</dt><dd>{brl(enq.rbt12)}</dd></div>
        <div>
          <dt>Simples Nacional</dt>
          <dd>{enq.simplesElegivel ? `Anexo ${enq.anexo} · ${enq.faixa}ª faixa · ${pct(enq.aliqEfetiva)}` : 'Fora do teto'}</dd>
        </div>
        {enq.fatorR !== null && <div><dt>Fator R</dt><dd>{pct(enq.fatorR, 1)}</dd></div>}
        <div>
          <dt>Regimes possíveis</dt>
          <dd className="pontos-regimes" title={regimes.map(([r, ok]) => `${NOMES_REGIME[r].nome}: ${ok ? 'sim' : 'não'}`).join(' · ')}>
            {regimes.map(([r, ok]) => <i key={r} className={`ponto c-${r} ${ok ? '' : 'apagado'}`} />)}
            {disponiveis} de 4
          </dd>
        </div>
      </dl>
      {alerta && (
        <p className={`barra-acao-alerta ${erros.length ? 'erro' : ''}`}>
          <Icone tipo={erros.length ? 'critico' : 'atencao'} />{alerta}
        </p>
      )}
      <button type="button" className="botao primario" disabled={erros.length > 0} onClick={onAvancar}>
        Gerar análise
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
      </button>
    </div>
  );
}
