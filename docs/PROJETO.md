# Projeto — Simulador de Regimes na Reforma Tributária (2027–2033)

> **Decisões tomadas (out/2026)**
> - **Público: o empresário final** (não o escritório contábil). Por isso a linguagem é simples, as perguntas usam o que o dono sabe (faturamento, folha, compras, margem, % de vendas para empresas) e cada número tem um "ver como chegamos aqui".
> - **O MVP é funcional e já está implementado**: app web em Vite + React + TypeScript, com o motor rodando no navegador, sem backend. Os dados ficam no `localStorage` e o PDF sai pelo "Salvar em PDF" (impressão do navegador). Para rodar, veja o [README](../README.md).
> - O MVP usa `number` com arredondamento ao centavo por linha (estimativa); `decimal.js` fica para o modo detalhado.
> - As seções 5 a 8 abaixo (banco, laudo, IA, carteira) continuam valendo como plano das próximas fases. Os itens de escritório (carteira, honorários, marca do escritório) saem do escopo enquanto o público for o empresário.

> Ferramenta para o contador comparar, ano a ano, a carga mensal de **Simples Unificado, Simples Híbrido, Lucro Presumido e Lucro Real** durante a transição da Reforma (EC 132/2023 + LC 214/2025), apontando o regime de menor carga, o ponto de virada e o efeito no crédito entregue a clientes PJ.
>
> Referência analisada: landing page "Planejamento Tributário para a Reforma" da e-Auditoria (out/2026).

---

## 1. Análise da referência

### 1.1 O que o produto deles faz
| Bloco | O que entrega | Relevância p/ nós |
|---|---|---|
| **Comparativo dos 4 regimes** (foco) | Abas de ano 2027–2033; 4 cards com carga mensal, badge "SEU REGIME HOJE" e "MENOR CARGA", variação % vs. regime atual; gráfico de linhas da carga mensal | **Núcleo do MVP** |
| Recomendação | "Em 2027: permanecer no Simples Unificado" + premissas (receita mensal, RBT12, alíquota IBS/CBS, margem) | MVP |
| Ponto de virada | Ano em que o melhor regime muda (ex.: "a partir de 2029, Lucro Real") | MVP |
| Duas linhas de futuro | "Parado no regime de hoje" × "melhor caminho a cada ano" (com trocas permitidas) | MVP (v1.1) |
| Leitura 2 — crédito | Crédito de IBS/CBS que a empresa entrega ao cliente PJ (limitado no Unificado × integral no Híbrido) | MVP |
| Modo rápido | Poucos parâmetros + médias setoriais (IBGE, estudos, legislação estadual), todos editáveis | MVP |
| Modo detalhado | Importa PGDAS, XML, EFD ICMS/IPI, EFD Contribuições, ECD, ECF | Fase 2–3 |
| Laudo | PDF/Excel com a marca do escritório; resumo e pontos de atenção por IA (IA **não calcula**) | Fase 2 |
| Carteira / honorários | Leitura em lote da carteira, priorização, proposta de reajuste de honorários | Fase 3 |

### 1.2 Observações técnicas da página
- O comparativo da página é **mock**: os valores estão fixos no JS (`DADOS = {'2027': {su:'R$ 1.084,69', sh:'R$ 2.142,48', ...}}`), e a troca de ano só substitui textos. Não há motor na landing.
- Os mocks nem são coerentes entre si: no card o Simples Unificado ganha em todos os anos, mas o gráfico de "ponto de virada" diz que o Lucro Real passa a ganhar em 2029. **Não dá para usar como gabarito de cálculo**, só como referência de UX.
- Premissas exibidas: receita mensal R$ 16.612,10 · RBT12 R$ 399.367,34 · IBS/CBS 27% (IBS 18,5% + CBS 8,5%) · margem 10%.
- Mensagem central: "motor determinístico amarrado à LC 214/2025; a IA interpreta, não calcula". **Vamos seguir o mesmo princípio.**

Os valores mockados da página estão na seção 9 (a virar `fixtures/demo-e-auditoria.json`), como referência visual para o desenvolvimento da UI.

---

## 2. Escopo

### MVP (o comparativo)
1. Cadastro da empresa-alvo (modo rápido): CNAE/atividade, UF/município, receita mensal ou RBT12, folha, margem, compras com crédito, mix B2B/B2C, regime atual.
2. Motor determinístico que calcula, para cada ano de 2027 a 2033 e cada um dos 4 regimes, a **carga mensal** quebrada por tributo.
3. Tela "4 regimes lado a lado" (seção 6) + gráfico ano a ano + ponto de virada + recomendação.
4. Leitura de crédito entregue ao cliente PJ.
5. Memória de cálculo auditável (cada número pode ser aberto até a fórmula e o parâmetro legal).

### Fora do MVP
Importação de SPED/XML, laudo PDF/Excel, IA, carteira em lote, honorários, multiusuário/escritório.

---

## 3. Regras de negócio (motor)

> **Todos os percentuais abaixo são parâmetros versionados por ano**, nunca constantes no código. As alíquotas de referência definitivas do IBS/CBS são fixadas pelo Senado/TCU durante a transição, então o usuário precisa poder sobrescrevê-las. Os itens marcados ⚠️ devem ser validados por um contador/tributarista antes de entrar em produção.

### 3.1 Cronograma da transição (parâmetros-base)

| Ano | CBS | IBS | ICMS/ISS (fator sobre a alíquota atual) | PIS/Cofins | IPI |
|---|---|---|---|---|---|
| 2026 | 0,9% (teste, compensável) | 0,1% (teste) | 100% | vigente | vigente |
| 2027 | alíquota cheia − 0,1 p.p. | 0,1% | 100% | **extintos** | zerado (exceto ZFM) |
| 2028 | alíquota cheia − 0,1 p.p. | 0,1% | 100% | — | idem |
| 2029 | cheia | 10% da ref. | 90% | — | idem |
| 2030 | cheia | 20% da ref. | 80% | — | idem |
| 2031 | cheia | 30% da ref. | 70% | — | idem |
| 2032 | cheia | 40% da ref. | 60% | — | idem |
| 2033 | cheia | 100% da ref. | **extintos** | — | idem |

Também entram como parâmetros: o Imposto Seletivo (a partir de 2027, por produto), reduções setoriais (60%, 30%, alíquota zero, regimes específicos) e o tratamento da base. ⚠️ Confirmar no art. 12 da LC 214 o que integra ou não a base do IBS/CBS durante a transição; o padrão do motor é ICMS/ISS/IPI **fora** da base.

### 3.2 Simples Nacional — Unificado (IBS/CBS dentro do DAS)
```
DAS_ano = Receita_mês × AlíqEfetiva(anexo, RBT12, ano)
AlíqEfetiva = (RBT12 × AlíqNominal − ParcelaDeduzir) / RBT12
```
- Anexo definido pelo CNAE; para os Anexos III/V, aplica-se o **Fator R** (folha 12m / RBT12 ≥ 28% → Anexo III).
- Tabela de **repartição por tributo** versionada por ano: a fatia de PIS/Cofins vira CBS a partir de 2027, e a fatia de ICMS/ISS migra para IBS entre 2029 e 2033 (conforme a nova redação da LC 123 dada pela LC 214). ⚠️ Carregar as tabelas oficiais dos anexos por ano.
- Sublimite de R$ 3,6 mi: acima dele, ICMS/ISS saem do DAS e são calculados no regime normal.
- Anexo IV: CPP fora do DAS (20% + RAT + terceiros sobre a folha).
- **Crédito entregue ao cliente PJ** = só a parcela de CBS+IBS efetivamente recolhida no DAS (crédito limitado).

### 3.3 Simples Nacional — Híbrido (IBS/CBS por fora do DAS)
```
DAS_reduzido = DAS_ano × (1 − %CBS_repartição − %IBS_repartição)
IBS/CBS_regular = (Receita_tributável × alíq_IBS_CBS_ano × (1 − redução_setorial))
                − Créditos(compras_com_crédito × alíq_efetiva_fornecedor)
Carga = DAS_reduzido + max(0, IBS/CBS_regular)   // saldo credor acumula para o mês seguinte
```
- **Crédito entregue ao cliente PJ** = integral (alíquota cheia do ano sobre a venda).
- Opção semestral; ver janela de opção (seção 3.7).

### 3.4 Lucro Presumido
```
IRPJ  = Receita × presunção_IRPJ (8% comércio/indústria, 32% serviços, etc.) × 15%
      + adicional 10% sobre (base trimestral − R$ 60 mil)
CSLL  = Receita × presunção_CSLL (12% / 32%) × 9%
CBS/IBS = débito − crédito (não cumulativo, igual ao Lucro Real)
ICMS/ISS = alíquota atual × fator do ano (3.1) − créditos de ICMS
CPP   = folha × (20% + RAT + terceiros)
PIS/Cofins = 0,65% + 3% cumulativos (só até 2026)
```
⚠️ Validar a majoração de presunção (+10% sobre a parcela de receita acima de R$ 5 mi/ano) trazida pela LC 224/2025, que deve virar parâmetro.

### 3.5 Lucro Real
```
Lucro_real = Receita × margem (modo rápido) | LALUR/ECF (modo detalhado)
IRPJ = 15% × Lucro + 10% × (Lucro − R$ 20 mil/mês)
CSLL = 9% × Lucro
CBS/IBS, ICMS/ISS e CPP = mesma lógica do Presumido
```
Os tributos sobre o consumo são iguais nos dois regimes de lucro a partir de 2027. Por isso **Presumido × Real só se diferenciam no IRPJ/CSLL**, e o motor pode compartilhar o módulo de IVA dual entre eles.

### 3.6 Leitura 2 — competitividade B2B
```
Crédito_entregue_ao_cliente = Venda_B2B × (alíq. creditável do regime no ano)
Custo_líquido_para_o_cliente = Preço − Crédito_entregue
```
Exibir lado a lado: "menor carga" × "melhor para vender a PJ". O % B2B é input do usuário.

### 3.7 Janela de opção (Simples)
- Primeira janela: 01/09 a 30/10/2026, com efeito em jan/2027 (Res. CGSN 186/2026, prorrogada pela 194/2026, segundo a referência). ⚠️ Confirmar o texto oficial.
- Fora da janela, a próxima opção é em março, com efeito em julho. O motor precisa saber disso para montar o "melhor caminho a cada ano" (trocar de regime não é livre a qualquer momento).

### 3.8 Fora do cálculo de carga, mas útil como alerta
- Tributação de dividendos acima de R$ 50 mil/mês por sócio (Lei 15.270/2025), que afeta a distribuição de lucros no LP/LR. Entra na Fase 2 como "pontos de atenção".

---

## 4. Arquitetura do motor

### 4.1 Princípios
1. **Função pura**: `simular(entrada, parametros) → resultado`. Sem I/O, sem data atual, sem aleatoriedade.
2. **Dinheiro em decimal** (`decimal.js`); arredondamento só na apresentação.
3. **Parâmetros legais versionados** (JSON/tabela) com `vigencia_inicio`, `vigencia_fim` e `fundamento_legal` (artigo/lei). Toda simulação grava a versão dos parâmetros usada.
4. **Memória de cálculo**: cada valor guarda `{valor, formula, insumos, fundamento}` para rastreabilidade.
5. Roda no **front e no back** (pacote TS compartilhado): a troca de ano na UI é instantânea, e o back recalcula para o laudo e o histórico.

### 4.2 Contrato
```ts
type Regime = 'SN_UNIFICADO' | 'SN_HIBRIDO' | 'PRESUMIDO' | 'REAL';
type Ano = 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033;

interface EntradaSimulacao {
  regimeAtual: Regime;
  atividade: { cnae: string; tipo: 'COMERCIO'|'INDUSTRIA'|'SERVICO'; anexoSN?: 1|2|3|4|5;
               reducaoIbsCbs?: 0 | 0.3 | 0.6 | 1; };
  local: { uf: string; codMunicipio: string; aliqIcms?: number; aliqIss?: number; };
  receitaMensal: Decimal; rbt12: Decimal;
  folhaMensal: Decimal; folha12m: Decimal;           // Fator R e CPP
  margemLucro: number;                               // Lucro Real (modo rápido)
  comprasComCreditoMensal: Decimal;                  // base de créditos IBS/CBS/ICMS
  percB2B: number;                                   // leitura de crédito
  crescimentoAnual?: number;                         // projeção de receita
  overrides?: Partial<ParametrosAno>;                // ex.: alíquota ref. IBS/CBS 27%
}

interface ResultadoAnoRegime {
  ano: Ano; regime: Regime;
  cargaMensal: Decimal;
  tributos: Record<'DAS'|'CBS'|'IBS'|'ICMS'|'ISS'|'IRPJ'|'CSLL'|'CPP'|'IS', LinhaMemoria>;
  creditoEntregueClientePJ: Decimal;
  variacaoVsAtual: number;                           // ex.: +0.9752
  elegivel: boolean; motivoInelegivel?: string;      // ex.: RBT12 > 4,8 mi → sem Simples
}

interface ResultadoSimulacao {
  matriz: ResultadoAnoRegime[];                      // 7 anos × 4 regimes
  menorCargaPorAno: Record<Ano, Regime>;
  pontosDeVirada: { ano: Ano; de: Regime; para: Regime }[];
  caminhoParado: { regime: Regime; total: Decimal };
  caminhoOtimo:  { trocas: { ano: Ano; regime: Regime }[]; total: Decimal }; // respeita janelas
  recomendacao: { acaoImediata: string; justificativa: string };
  versaoParametros: string;
}
```

### 4.3 Pipeline
```
entrada → normalizar (Fator R, anexo, faixa, elegibilidade)
        → para cada ano: projetar receita/folha → carregar ParametrosAno
        → para cada regime: calcular tributos → somar carga → crédito entregue
        → comparar (menor carga, delta % vs. atual, viradas)
        → otimizar caminho (programação dinâmica sobre 7 anos com custo de troca/restrições)
        → resultado + memória
```

---

## 5. Modelo de dados (Postgres)

| Tabela | Campos principais |
|---|---|
| `escritorio` | id, nome, logo, cores (p/ laudo) |
| `usuario` | id, escritorio_id, papel |
| `empresa` | id, escritorio_id, cnpj, razao, cnae, uf, municipio, regime_atual |
| `simulacao` | id, empresa_id, modo (RAPIDO/DETALHADO), entrada_json, resultado_json, versao_parametros, criado_por, criado_em |
| `parametro_legal` | id, chave, ano, valor_json, vigencia_ini, vigencia_fim, fundamento, versao |
| `tabela_simples` | anexo, faixa, ano, aliq_nominal, parcela_deduzir, reparticao_json |
| `media_setorial` | cnae, uf, margem, %compras_credito, %folha, %B2B, fonte |
| `documento_importado` (fase 2) | id, empresa_id, tipo (PGDAS/XML/EFD/ECD/ECF), periodo, status, metricas_extraidas_json |

---

## 6. Especificação do componente "4 regimes lado a lado"

### 6.1 Layout
```
┌ Os 4 regimes lado a lado · carga mensal ───────────────────────────────┐
│  [2027] 2028  2029  2030  2031  2032  2033        (tabs, ←/→ navegam)  │
│                                                                        │
│ ┌SEU REGIME HOJE┐┌───────────────┐┌───────────────┐┌───────────────┐   │
│ │ MENOR CARGA   ││               ││               ││               │   │
│ │Simples Unific.││Simples Híbrido││Lucro Presumido││ Lucro Real    │   │
│ │DAS único      ││DAS red.+IBS/  ││presunção+IBS/ ││lucro real+IBS/│   │
│ │R$ 1.084,69/mês││R$ 2.142,48/mês││R$ 2.375,39/mês││R$ 2.415,26/mês│   │
│ │regime atual   ││▲ +97,52%      ││▲ +118,99%     ││▲ +122,67%     │   │
│ │[ver memória]  ││[ver memória]  ││[ver memória]  ││[ver memória]  │   │
│ └───────────────┘└───────────────┘└───────────────┘└───────────────┘   │
│                                                                        │
│  Carga mensal ano a ano (linhas, 4 séries, ano selecionado destacado)  │
│  ● ponto de virada: "a partir de 2029, Lucro Real"                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Regras de exibição
- **Badges**: "SEU REGIME HOJE" fica fixo no `regimeAtual`. "MENOR CARGA" vai para o `min(cargaMensal)` do ano selecionado e pode cair no mesmo card do regime atual. Em caso de empate (< R$ 1,00), mostrar os dois.
- **Delta**: `(carga_regime − carga_atual) / carga_atual`. Mostrar "Aumento de X%" (cor de alerta) ou "Economia de X%" (cor positiva). O card do regime atual mostra "regime atual (base)".
- **Inelegível** (ex.: RBT12 > R$ 4,8 mi para o Simples; atividade vedada): card esmaecido com o motivo, sem valor.
- **Memória de cálculo**: o drawer do card mostra a quebra por tributo, a fórmula e o fundamento legal.
- **Toggle "Leitura 2"**: troca o valor principal do card para "crédito entregue ao cliente PJ/mês".
- **Toggle mensal/anual** e **"parado × melhor caminho"** (soma acumulada 2027–2033).
- Os dados vêm de `ResultadoSimulacao.matriz`, já calculada no client, então a troca de ano não faz requisição.
- Acessibilidade: `role="tablist"`, `aria-selected`, setas do teclado; valores em `font-variant-numeric: tabular-nums`; formatação com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`.
- Gráfico: 4 séries com cores fixas por regime (as mesmas dos cards), linha vertical no ano selecionado e marcador no ponto de virada.

### 6.3 Estados
Carregando (skeleton) · sem dados (CTA "preencher premissas") · premissas incompletas (cards com "estimativa por média setorial") · erro de parâmetro (ano sem tabela vigente).

---

## 7. Stack sugerida

| Camada | Escolha | Por quê |
|---|---|---|
| Motor | **TypeScript puro** (`packages/motor`) + `decimal.js` + Vitest | Roda no front e no back; testável por casos de gabarito |
| Front | Next.js + React + Tailwind + Recharts | Componente de abas/cards/gráfico; SSR para o laudo |
| API | Next.js route handlers ou Fastify | CRUD de empresa/simulação, versão de parâmetros |
| Banco | Postgres (Prisma) | Relacional, JSONB para entrada/resultado |
| Parsers (fase 2) | TS (SPED é TXT delimitado por `\|`; XML NF-e via `fast-xml-parser`) | Mesmo monorepo |
| Laudo (fase 2) | PDF via Playwright (HTML → PDF) · Excel via `exceljs` | Reaproveita os componentes da tela |
| IA (fase 2) | Claude API (`claude-sonnet-5-5`), que recebe o `ResultadoSimulacao` já calculado e devolve resumo e pontos de atenção | IA só redige, nunca calcula |

---

## 8. Estrutura de pastas
```
analise-de-contabilidade/
├─ apps/
│  └─ web/                       # Next.js
│     ├─ app/(simulador)/empresa/[id]/simulacao/page.tsx
│     └─ components/comparativo/
│        ├─ ComparativoRegimes.tsx   # container (seção 6)
│        ├─ AbasAno.tsx
│        ├─ CardRegime.tsx
│        ├─ GraficoCargaAnual.tsx
│        ├─ PontoDeVirada.tsx
│        └─ MemoriaCalculoDrawer.tsx
├─ packages/
│  ├─ motor/
│  │  ├─ src/
│  │  │  ├─ index.ts              # simular()
│  │  │  ├─ regimes/{simplesUnificado,simplesHibrido,lucroPresumido,lucroReal}.ts
│  │  │  ├─ modulos/{ivaDual,icmsIss,irpjCsll,cpp,fatorR,creditoB2B}.ts
│  │  │  ├─ comparador.ts         # menor carga, deltas, viradas
│  │  │  ├─ otimizador.ts         # caminho ótimo com janelas de opção
│  │  │  └─ memoria.ts
│  │  ├─ parametros/
│  │  │  ├─ transicao.2027-2033.json
│  │  │  ├─ simples-anexos/{2027..2033}.json
│  │  │  └─ medias-setoriais.json
│  │  └─ test/casos-gabarito/*.json   # casos validados por contador
│  └─ parsers/ (fase 2)  pgdas | nfe-xml | efd-icms-ipi | efd-contrib | ecd | ecf
├─ fixtures/demo-e-auditoria.json
└─ docs/PROJETO.md
```

---

## 9. Fixture de UI (mock da referência)
Os valores da landing, que servem só para desenvolver o layout e **não** para testar o motor:

| Ano | Simples Unificado | Simples Híbrido | Lucro Presumido | Lucro Real |
|---|---|---|---|---|
| 2027 | 1.084,69 | 2.142,48 (+97,52%) | 2.375,39 (+118,99%) | 2.415,26 (+122,67%) |
| 2028 | 1.129,85 | 2.216,90 (+96,21%) | 2.498,12 (+121,10%) | 2.540,77 (+124,88%) |
| 2029 | 1.298,44 | 2.612,33 (+101,19%) | 3.084,56 (+137,56%) | 3.138,90 (+141,75%) |
| 2030 | 1.364,17 | 2.871,05 (+110,46%) | 3.412,28 (+150,14%) | 3.470,62 (+154,41%) |
| 2031 | 1.441,02 | 3.095,74 (+114,83%) | 3.684,90 (+155,72%) | 3.748,15 (+160,11%) |
| 2032 | 1.502,68 | 3.268,41 (+117,50%) | 3.902,55 (+159,71%) | 3.970,88 (+164,25%) |
| 2033 | 1.587,30 | 3.489,60 (+119,85%) | 5.128,40 (+223,10%) | 5.240,15 (+230,14%) |

Sanidade rápida, com as premissas da página (RBT12 R$ 399.367,34; Anexo I, 3ª faixa: 9,5% nominal, dedução R$ 13.860): alíquota efetiva de aproximadamente 6,03%, o que dá um DAS de aproximadamente **R$ 1.001/mês**. A página mostra R$ 1.084,69, então os números deles são ilustrativos ou usam outro anexo/ajuste. Mais um motivo para os **casos-gabarito** virem de contadores, e não da landing.

---

## 10. Roadmap

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **0 — Fundamentos (1–2 sem.)** | Levantamento legal (LC 214, LC 123 alterada, resoluções CGSN, tabelas de repartição); ≥ 10 casos-gabarito calculados à mão por contador | Planilha-gabarito assinada |
| **1 — Motor (3–4 sem.)** | `packages/motor` com os 4 regimes, transição, Fator R, sublimite, crédito B2B, memória | 100% dos casos-gabarito batendo ao centavo |
| **2 — Comparativo (2–3 sem.)** | Tela da seção 6 + formulário do modo rápido + médias setoriais | Usabilidade validada com 3 contadores |
| **3 — Caminho ótimo e recomendação (1–2 sem.)** | Otimizador com janelas de opção, ponto de virada, texto de recomendação determinístico | — |
| **4 — Laudo (2–3 sem.)** | PDF/Excel com marca do escritório; IA para resumo e pontos de atenção | Laudo revisado por contador |
| **5 — Modo detalhado (4–6 sem.)** | Parsers PGDAS-D, NF-e XML, EFD ICMS/IPI, EFD Contribuições, ECD, ECF → preenchem a entrada | Import de 5 empresas reais |
| **6 — Carteira e honorários** | Simulação em lote, ranking de prioridade, proposta de honorários | — |

---

## 11. Riscos e pontos em aberto
1. **Alíquotas de referência** do IBS/CBS ainda serão calibradas, então o parâmetro precisa ser editável e o laudo deve trazer o aviso "estimativa direcional".
2. **Tabelas do Simples por ano** (repartição IBS/CBS no DAS) dependem da regulamentação do CGSN. É o maior risco de precisão do Simples Unificado × Híbrido.
3. **Créditos no modo rápido** dependem de estimar % de compras com crédito. Sem documentos, isso é a maior fonte de erro do Híbrido/LP/LR, então vale mostrar sensibilidade (±10 p.p.).
4. Regimes específicos (combustíveis, financeiro, saúde, imobiliário, cooperativas) e benefícios estaduais (ex.: COMPETE-ES): ficam fora do MVP e devem ser marcados como "não coberto".
5. Responsabilidade: o termo de uso deixa claro que a decisão é do contador; versionar os parâmetros garante a reprodutibilidade de qualquer laudo emitido.

### Decisões a tomar
- [ ] Público: só escritórios contábeis (B2B SaaS) ou também empresário final?
- [ ] Stack TS ponta a ponta (recomendada) ou back em Python?
- [ ] Quem fornece e assina os casos-gabarito da Fase 0?
