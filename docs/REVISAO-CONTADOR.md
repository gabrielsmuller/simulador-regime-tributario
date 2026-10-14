# Pontos para revisar com o contador

Lista do que o simulador assume e precisa de validação técnica antes de uso comercial.
Cada item indica onde está no código, para facilitar o ajuste.

Legenda: 🔴 alto impacto no resultado · 🟡 médio · 🟢 baixo

---

## 1. Regimes na Reforma (`src/motor/parametros.ts`, `regimes.ts`)

| | Ponto | O que o simulador faz hoje | Pergunta para o contador |
|---|---|---|---|
| 🔴 | Alíquotas de IBS e CBS | IBS 18,7% + CBS 9,21% (estimativa Res. CGIBS 14/2026). CBS 2027–28 com −0,1 p.p.; IBS de 0,1% | Atualizar quando o Senado fixar a CBS (prazo 15/12/2026) |
| 🔴 | Tabelas do Simples 2027–2033 | Copiadas dos Anexos XVIII a XXII da LC 214 (redação LC 227/2026) | Conferir se houve nova alteração e se o CGSN publicou ajustes |
| 🔴 | Margem de lucro no Lucro Real | Média do setor ou valor informado; mesma margem em todos os anos | Usar margem real do balanço/ECF |
| 🟡 | Créditos de IBS/CBS nas compras | Só compras de fornecedores fora do Simples (padrão 70%), crédito pela alíquota cheia | Confirmar o perfil real de fornecedores; crédito do Simples foi zerado (conservador) |
| 🟡 | ISS no limite da 5ª faixa | Não aplica a regra de teto de 5% de ISS na partilha (não altera o DAS total) | Aceitável para o piloto? |
| 🟡 | LC 224/2025 (presunção +10%) | Aplicada sobre a receita acima de R$ 5 mi/ano | Há liminares (ADI 7.920). Considerar ou não por cliente |
| 🟡 | INSS patronal fora do Simples | 27,8% (20% + RAT 2% + terceiros 5,8%) | RAT/FAP e terceiros reais da empresa |
| 🟢 | Fora da conta | FGTS, Imposto Seletivo, IPI, substituição tributária, regimes específicos (combustíveis, financeiro, imobiliário, saúde suplementar) | Quais desses vale incluir na próxima versão? |
| 🟢 | Fator R | Folha 12 meses ÷ receita 12 meses, com folha mensal × 12 | Incluir 13º e encargos na folha? |

## 2. DIFAL nas vendas a consumidor final de outros estados (`regimes.ts`, `icms.ts`)

| | Ponto | O que o simulador faz hoje | Pergunta |
|---|---|---|---|
| 🔴 | DIFAL para optante do Simples | **Não cobra** na venda a não contribuinte (STF ADI 5464; SEFAZ-SP RC 32359/2025). Opção "cenário conservador" no módulo de ICMS | Confirmar a posição para os estados de destino dos clientes |
| 🔴 | Base dupla × base única | Padrão base dupla (LC 190/2022); base única como opção | Qual método cada destino aplica hoje |
| 🟡 | DIFAL na comparação de regimes | Calculado sobre o % de vendas a consumidor final de outro estado, para um destino principal | Para clientes com vendas pulverizadas, usar média ponderada de destinos? |
| 🟡 | Crédito de ICMS nas compras | Pela alíquota interna da origem sobre todas as compras | Compras interestaduais (7%/12%) e ST nas entradas |

## 3. ST e DIFAL por estado (`src/motor/icms.ts`)

| | Ponto | O que o simulador faz hoje | Pergunta |
|---|---|---|---|
| 🔴 | Existência de ST | O usuário marca se o produto tem ST; o simulador assume ST em todos os destinos | Precisamos de base de protocolos/convênios por NCM/CEST? |
| 🔴 | MVA | Informada pelo usuário (padrão 40%). MVA ajustada só fora do Simples (Conv. 142/2018, cl. 11) | Fonte de MVA por produto e estado |
| 🟡 | Alíquotas internas | Modal de 2026 por UF (MA 23%, PI 22,5%, AL/BA/PE 20,5%, PR/RO 19,5%…) | Conferir os estados com divergência entre fontes (MA, PI, AL, SE, PR) |
| 🟡 | FCP | Só o geral do RJ (2%); demais estados 0%, editável | Incluir FCP por produto nos estados principais |
| 🟡 | ICMS próprio do Simples na ST | Deduz pela alíquota interestadual | Confirmar |
| 🟢 | Uso e consumo | DIFAL calculado em base dupla e marcado como do comprador (ou do vendedor, se houver ST) | OK? |
| 🟢 | Transição | Todas as alíquotas de ICMS × fator (90% em 2029 … 0 em 2033) | OK? |

## 4. Benefícios fiscais (`src/motor/beneficios.ts`)

Catálogo inicial de 9 benefícios em 6 estados. **Todos marcados "confirmar com contador" na tela.**

| | Benefício | Carga usada | Pergunta |
|---|---|---|---|
| 🔴 | SC · TTD 478 (e-commerce) | 1% (4%) ou 2% (7% e 12%) + 0,4% de fundos | Percentuais e fundos vigentes; compatibilidade com o perfil dos clientes |
| 🔴 | SC · TTD 409/410/411 (importação) | 1% + 0,4% de fundos nas saídas a 4% | Requisitos de faturamento (fonte não oficial cita R$ 280 mi desde 03/2026) |
| 🔴 | ES · Compete e-commerce | 1,1% | Confirmar a carga e os requisitos atuais (Portaria 176-R/2025) |
| 🔴 | ES · Compete atacadista | 1,1% | Mecanismo de crédito presumido de 2024 |
| 🔴 | MG · TTS e-commerce | 1,3% (interestadual) | Confirmar no texto da Res. SEF 5.793/2024 |
| 🟡 | PE · Prodepe importador | Crédito de 47,5% do débito (carga 2,1% a 4%) | Percentual varia por decreto |
| 🟡 | GO · e-commerce | Sem percentual (não quantificado) | Percentual vigente após a alteração de 04/2026 |
| 🟡 | GO · atacadista e indústria | Sem percentual | Percentual do crédito outorgado e exigência de TARE |
| 🟡 | PR · Paraná Competitivo | Sem percentual | Percentual do Decreto 7.721/2024 e renovações após 30/09/2026 |

Também a validar:
- A economia compara só o ICMS de origem. Não considera custo de filial, logística ou contrapartidas (fundos, investimentos, empregos).
- Estados ainda não cobertos: AL, AM (ZFM), BA (Desenvolve), CE, MS, MT, RJ, RS, SP, TO e outros.

## 5. Gerais

- Valores em `number` com arredondamento por linha (estimativa). Para laudo formal, migrar para decimal.
- Os dados ficam só no navegador do usuário (localStorage). Não há cadastro nem servidor.
- Textos de recomendação são automáticos e determinísticos: revisar o tom e a responsabilidade (termo de uso).
- Prazo de opção entre Simples Unificado e Híbrido: confirmar o calendário vigente. Temos 30/10/2026 (Res. CGSN 194/2026, prorrogação) para vigorar em jan.–jun./2027; o simuladorreforma.com.br cita janelas em setembro e março (art. 40-D da Res. CGSN 140/2018, redação da 190/2026). Hoje o simulador não exibe prazo; só exibir depois de confirmado.

## 6. Preço e contratos (`src/motor/preco.ts`)

- Base "hoje" (2026): Simples com o mesmo DAS de 2027 (LC 214 manteve a alíquota total; conferir a 6ª faixa contra a LC 123). Presumido com PIS/COFINS cumulativo (0,65% + 3%); Real não cumulativo (1,65% + 7,6%) com crédito sobre todas as compras sem o ICMS (Lei 14.592/2023).
- ICMS destacado excluído da base do PIS/COFINS (Tema 69). ISS mantido na base (Tema 118). Sem IPI e sem as atividades do Real que seguem no cumulativo (Lei 10.833, art. 10).
- Reajuste = fator de preço que mantém faturamento − tributos igual ao de hoje, com custos e folha fixos e sem crescimento. Validar se o empresário entende "mesmo lucro" assim.
- Clientes que aproveitam crédito: novo campo (padrão 100%). Optantes do Simples Unificado e MEI não aproveitam.
- Conferência externa (14/10/2026): no simuladordareforma.com.br, o "Atacado regional" deu o mesmo DAS (R$ 393.180/ano), o mesmo DAS reduzido do Híbrido ano a ano e o mesmo crédito aos clientes no Unificado. A diferença no Híbrido vem só das alíquotas de referência (eles usam CBS 8,4%–8,5% e IBS 18,5%; nós, 9,21% e 18,7%).
