import { useMemo } from 'react';
import { ANOS, NOMES_REGIME, REGIMES, ajustePreco, simular, type AjusteAno, type Entrada, type Regime } from '../motor';
import { CampoNumero, Icone, Painel, Segmentado } from './campos';
import { validar } from './diagnostico';
import { brl, pct } from './formato';

export interface Contrato { valor: number; inicio: number; fim: number; regime: Regime | null }
export const CONTRATO_PADRAO: Contrato = { valor: 10_000, inicio: 2026, fim: 2033, regime: null };
export const contratoValido = (v: unknown): v is Contrato =>
  !!v && typeof v === 'object' && typeof (v as Contrato).valor === 'number' && typeof (v as Contrato).inicio === 'number';

const ANOS_CONTRATO = [2026, ...ANOS];
export const variacao = (f: number) => `${f >= 1 ? '+' : '−'}${pct(Math.abs(f - 1), 1)}`;

/** Regime simulado: o escolhido no módulo, se disponível; senão o de hoje (o Híbrido não existe em 2026). */
export function regimeDoContrato(empresa: Entrada, contrato: Contrato, elegiveis: Regime[]): Regime {
  const hoje: Regime = empresa.regimeAtual === 'SN_HIBRIDO' ? 'SN_UNIFICADO' : empresa.regimeAtual;
  return contrato.regime && elegiveis.includes(contrato.regime) ? contrato.regime
    : elegiveis.includes(hoje) ? hoje : elegiveis[0] ?? hoje;
}

/** Valor do contrato ano a ano: 2026 é a base (fator 1); 12 meses em cada ano. */
export function calcularContrato(contrato: Contrato, anos: AjusteAno[]) {
  const fatorAno = (ano: number) => (ano === 2026 ? 1 : anos.find((a) => a.ano === ano)?.fator ?? null);
  const linhas = ANOS_CONTRATO.filter((a) => a >= contrato.inicio && a <= contrato.fim).map((ano) => ({ ano, fator: fatorAno(ano) }));
  const original = linhas.length * contrato.valor * 12;
  const ajustado = linhas.reduce((s, l) => s + contrato.valor * 12 * (l.fator ?? NaN), 0);
  return { linhas, original, ajustado };
}

export function ModuloPreco({ empresa, contrato, onContrato, onDados }: {
  empresa: Entrada; contrato: Contrato; onContrato: (c: Contrato) => void; onDados: () => void;
}) {
  const valido = validar(empresa).erros.length === 0;
  const res = useMemo(() => (valido ? simular(empresa) : null), [empresa, valido]);
  const elegiveis = res ? REGIMES.filter((r) => res.anos[0].regimes[r].elegivel) : [];
  const regimeHoje: Regime = empresa.regimeAtual === 'SN_HIBRIDO' ? 'SN_UNIFICADO' : empresa.regimeAtual;
  const regime = regimeDoContrato(empresa, contrato, elegiveis);
  const ajuste = useMemo(() => (valido ? ajustePreco(empresa, regime) : null), [empresa, regime, valido]);

  if (!ajuste || !res) {
    return (
      <div className="etapa">
        <div className="etapa-titulo"><h1>Preço e contratos</h1></div>
        <section className="painel vazio-rel">
          <p>Preencha os dados da empresa para calcular o reajuste.</p>
          <button type="button" className="botao primario" onClick={onDados}>Ir para os dados da empresa</button>
        </section>
      </div>
    );
  }

  const { hoje, anos } = ajuste;
  const a27 = anos[0], a33 = anos[anos.length - 1];
  const fatores = anos.map((a) => a.fator).filter((f): f is number => f !== null);
  // escala mínima de ±5% para um ajuste pequeno não parecer grande
  const maxDesvio = Math.max(0.05, ...fatores.map((f) => Math.abs(f - 1)));
  const mesmoRegime = regime === regimeHoje;
  const nomeHoje = NOMES_REGIME[hoje.regime].nome.replace('Simples Unificado', 'Simples Nacional');
  const titulo = a27.fator === null ? 'Este regime não fecha a conta em 2027'
    : fatores.every((f) => Math.abs(f - 1) < 0.0005) ? 'Seu preço pode ficar igual até 2033'
    : a27.fator >= 1 ? `Para manter o lucro, o preço sobe ${pct(a27.fator - 1, 1)} em 2027`
    : `Dá para baixar o preço em ${pct(1 - a27.fator, 1)} em 2027 e manter o lucro`;
  const { linhas: anosContrato, original: totalOriginal, ajustado: totalAjustado } = calcularContrato(contrato, anos);

  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <h1>Preço e contratos</h1>
        <p>Quanto o preço precisa mudar, ano a ano, para você manter o mesmo lucro que tem hoje.</p>
      </div>

      <section className="barra-parametros" aria-label="Regime da simulação">
        <div className="parametros">
          <div className="parametro largo">
            <span>Regime a partir de 2027</span>
            <Segmentado rotulo="Regime a partir de 2027" valor={regime} onChange={(r) => onContrato({ ...contrato, regime: r })}
              opcoes={elegiveis.map((r) => ({ valor: r, rotulo: NOMES_REGIME[r].nome + (r === regimeHoje ? ' (hoje)' : '') }))} />
          </div>
        </div>
      </section>

      <section className="resumo" aria-labelledby="t-preco">
        <div className="recomendacao">
          <p className="sobretitulo">{mesmoRegime ? `Ficando no ${NOMES_REGIME[regime].nome}` : `Trocando para o ${NOMES_REGIME[regime].nome}`}</p>
          <h2 id="t-preco">{titulo}</h2>
          <ul>
            <li>Comparado a hoje no {nomeHoje}, com {brl(hoje.carga)}/mês de tributos.</li>
            {a33.fator !== null && Math.abs(a33.fator - 1) >= 0.0005 && (
              <li>Em 2033, com a Reforma completa, o ajuste chega a {variacao(a33.fator)}.</li>
            )}
            {regime.startsWith('SN_') && a33.fator === null && a33.motivo && <li>{a33.motivo}.</li>}
          </ul>
        </div>
        <div className="kpis tres">
          <div className="kpi">
            <span className="kpi-rotulo">Reajuste em 2027</span>
            <span className={`kpi-valor ${a27.fator !== null && a27.fator < 0.9995 ? 'bom' : ''}`}>{a27.fator === null ? '—' : variacao(a27.fator)}</span>
            <span className="kpi-nota">{a27.fator === null ? 'Indisponível' : `R$ 100,00 passa a R$ ${(a27.fator * 100).toFixed(2).replace('.', ',')}`}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">Reajuste em 2033</span>
            <span className={`kpi-valor ${a33.fator !== null && a33.fator < 0.9995 ? 'bom' : ''}`}>{a33.fator === null ? '—' : variacao(a33.fator)}</span>
            <span className="kpi-nota">{a33.fator === null ? 'Indisponível' : `R$ 100,00 passa a R$ ${(a33.fator * 100).toFixed(2).replace('.', ',')}`}</span>
          </div>
          <div className="kpi">
            <span className="kpi-rotulo">Tributos hoje</span>
            <span className="kpi-valor">{brl(hoje.carga)}<small>/mês</small></span>
            <span className="kpi-nota">{pct(empresa.faturamentoMensal ? hoje.carga / empresa.faturamentoMensal : 0, 1)} do faturamento em 2026</span>
          </div>
        </div>
      </section>

      <Painel titulo="Reajuste necessário, ano a ano" subtitulo={`No ${NOMES_REGIME[regime].nome}, para manter o lucro de hoje depois dos tributos`}>
        <div className="reajustes" role="list">
          {anos.map((a) => {
            const f = a.fator;
            const largura = f === null ? 0 : (Math.abs(f - 1) / maxDesvio) * 50;
            return (
              <div key={a.ano} className="reajuste" role="listitem">
                <span className="reajuste-ano">{a.ano}</span>
                <span className="reajuste-trilho" aria-hidden="true">
                  <span className="reajuste-zero" />
                  {f !== null && <span className={`reajuste-barra ${f >= 1 ? 'sobe' : 'desce'}`}
                    style={f >= 1 ? { left: '50%', width: `${largura}%` } : { right: '50%', width: `${largura}%` }} />}
                </span>
                <span className={`reajuste-valor ${f !== null && f < 0.9995 ? 'desce' : f !== null && f > 1.0005 ? 'sobe' : ''}`}>
                  {f === null ? '—' : Math.abs(f - 1) < 0.0005 ? 'igual' : variacao(f)}
                </span>
                <span className="reajuste-preco">{f === null ? (a.motivo ?? 'Indisponível') : `R$ 100,00 → R$ ${(f * 100).toFixed(2).replace('.', ',')}`}</span>
              </div>
            );
          })}
        </div>
        <div className="legenda-reajuste" aria-hidden="true">
          <span><i className="desce" />Pode baixar o preço</span>
          <span><i className="sobe" />Precisa subir o preço</span>
        </div>
        {empresa.percVendasEmpresas > 0 && a33.fator !== null && a33.creditoPorReal > 0 && (
          <p className="destaque-credito">
            <Icone tipo="info" />
            Em 2033, seus clientes empresas recuperam {brl(a33.creditoPorReal * 100 * a33.fator)} de crédito de IBS/CBS
            a cada {brl(100 * a33.fator)} comprados de você neste regime.
          </p>
        )}
      </Painel>

      <Painel titulo="Contratos de longo prazo" subtitulo="Valor mensal de um contrato que atravessa a transição, corrigido ano a ano">
        <div className="parametros contrato-campos">
          <label className="parametro">
            <span>Valor mensal hoje</span>
            <CampoNumero id="c-valor" prefixo="R$" valor={contrato.valor} onChange={(v) => onContrato({ ...contrato, valor: v })} />
          </label>
          <label className="parametro">
            <span>Início</span>
            <select value={contrato.inicio} onChange={(ev) => {
              const inicio = Number(ev.target.value);
              onContrato({ ...contrato, inicio, fim: Math.max(inicio, contrato.fim) });
            }}>
              {ANOS_CONTRATO.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="parametro">
            <span>Término</span>
            <select value={contrato.fim} onChange={(ev) => {
              const fim = Number(ev.target.value);
              onContrato({ ...contrato, fim, inicio: Math.min(fim, contrato.inicio) });
            }}>
              {ANOS_CONTRATO.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Ano</th>
                <th scope="col" className="num">Valor mensal hoje</th>
                <th scope="col" className="num">Reajuste</th>
                <th scope="col" className="num">Valor mensal ajustado</th>
                <th scope="col" className="num">Diferença no ano</th>
              </tr>
            </thead>
            <tbody>
              {anosContrato.map(({ ano, fator: f }) => {
                return (
                  <tr key={ano}>
                    <th scope="row">{ano}{ano === 2026 && <span className="tag">hoje</span>}</th>
                    <td className="num">{brl(contrato.valor)}</td>
                    <td className="num">{f === null ? '—' : Math.abs(f - 1) < 0.0005 ? '—' : variacao(f)}</td>
                    <td className="num">{f === null ? '—' : brl(contrato.valor * f)}</td>
                    <td className={`num ${f !== null && f > 1.0005 ? 'pior' : f !== null && f < 0.9995 ? 'melhor' : ''}`}>
                      {f === null ? '—' : brl(contrato.valor * 12 * (f - 1))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num">{brl(totalOriginal)}</td>
                <td />
                <td className="num">{brl(totalAjustado)}</td>
                <td className="num">{brl(totalAjustado - totalOriginal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="nota">Considera 12 meses em cada ano do contrato. Confira se ele prevê reajuste por mudança na tributação.</p>
      </Painel>

      <p className="nota aviso">
        Premissas: os custos e a folha não mudam, sem crescimento de vendas, e o mesmo reajuste vale para todos os produtos.
        O lucro mantido é em reais, depois de todos os tributos (inclusive IRPJ/CSLL). Hoje (2026) considera PIS/COFINS
        {hoje.regime === 'PRESUMIDO' ? ' cumulativo' : hoje.regime === 'REAL' ? ' não cumulativo' : ' dentro do DAS'}; não inclui IPI.
      </p>
    </div>
  );
}
