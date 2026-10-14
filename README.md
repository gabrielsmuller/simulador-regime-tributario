# Simulador da Reforma Tributária

Análise tributária para o empresário, em módulos:

- **Regimes na Reforma**: compara, ano a ano de 2027 a 2033, o imposto no Simples Unificado, Simples Híbrido, Lucro Presumido e Lucro Real, com recomendação, ponto de virada e crédito entregue a clientes PJ.
- **ST e DIFAL**: calcula o ICMS de uma venda para cada um dos 27 estados (alíquota interestadual, DIFAL e substituição tributária) e mostra em qual destino a carga é menor.
- **Benefícios fiscais**: catálogo de incentivos estaduais de ICMS (SC, ES, MG, PE, GO, PR) filtrado pelo perfil da empresa, com economia estimada.
- **Relatório**: junta regime, ICMS interestadual, benefícios, pontos de atenção e o que validar com o contador numa página para imprimir.

O cadastro da empresa é único: estado, regime e vendas para outros estados valem para todos os módulos.
Pontos que dependem de validação técnica: [docs/REVISAO-CONTADOR.md](docs/REVISAO-CONTADOR.md).

## Rodar

```bash
npm install
```
```bash
npm run dev
```
Abra http://localhost:5173.

```bash
npm test
```
```bash
npm run build
```
O build gera um site estático em `dist/`.

## Hospedagem (AWS)

Piloto no ar em **https://simuladortributario.gabrielsmuller.dev** (também em https://d3ikdc9bz77qrz.cloudfront.net).

| Recurso | Valor |
|---|---|
| Conta / região | 958620575923 / us-east-1 |
| Bucket S3 (privado, criptografado) | `simulador-reforma-958620575923` |
| CloudFront | `E2A2R1X5DYN9KT` (HTTPS, HTTP/3, cabeçalhos de segurança gerenciados) |
| Acesso ao bucket | só pela distribuição, via Origin Access Control `E1H6HDIBPSBCD6` |
| Domínio | `simuladortributario.gabrielsmuller.dev` (Route 53 + certificado ACM em us-east-1) |

Todos os recursos têm a tag `Project=simulador-reforma`. Para publicar uma nova versão:

```bash
npm run deploy
```
O script roda os testes, faz o build, envia para o S3 (assets com cache de 1 ano, ícones e prévia com 1 dia, `index.html` sem cache) e invalida o cache do CloudFront.

## Estrutura

```
src/
├─ motor/                 # cálculo determinístico, sem I/O (testado)
│  ├─ tipos.ts            # contratos de entrada e resultado
│  ├─ parametros.ts       # TODA regra numérica: transição, anexos do Simples, ICMS por UF, atividades
│  ├─ regimes.ts          # cálculo dos 4 regimes + memória de cálculo
│  ├─ simular.ts          # orquestra os 7 anos, menor carga, viradas, recomendação
│  ├─ icms.ts             # ICMS interestadual: alíquotas 4/7/12%, DIFAL (base dupla/única), ST e MVA ajustada
│  ├─ beneficios.ts       # catálogo de benefícios estaduais e cálculo da economia
│  ├─ motor.test.ts
│  ├─ icms.test.ts
│  └─ beneficios.test.ts
└─ ui/
   ├─ App.tsx             # barra superior, módulos e estado compartilhado
   ├─ estado.ts           # cadastro da empresa e operação salvos no navegador
   ├─ ModuloRegimes.tsx   # módulo de regimes (etapas de dados e análise)
   ├─ ModuloBeneficios.tsx# buscador de benefícios fiscais
   ├─ ModuloRelatorio.tsx # relatório consolidado para imprimir
   ├─ icms/ModuloIcms.tsx # módulo de ST e DIFAL
   ├─ icms/MapaBrasil.tsx # mapa de blocos dos 27 estados
   ├─ EtapaDados.tsx      # etapa 1: atividade, regime, números, premissas + enquadramento
   ├─ EtapaAnalise.tsx    # etapa 2: resumo, comparativo, tabelas, crédito, memória, base legal
   ├─ graficos.tsx        # evolução (linhas com tooltip) e composição por tributo
   ├─ diagnostico.ts      # validação dos dados e pontos de atenção
   ├─ campos.tsx          # campos, seções, painéis, ícones
   └─ styles.css          # tema claro, responsivo e impressão
```

Documento de projeto e regras: [docs/PROJETO.md](docs/PROJETO.md).

## Premissas a validar com um contador antes de publicar
Os pontos estão marcados com ⚠️ em `src/motor/parametros.ts`:
- alíquotas de referência do IBS/CBS (padrão: 8,8% + 17,7%);
- repartição do DAS pós-reforma (o MVP supõe que a fatia de PIS/Cofins vira CBS e que a de ICMS/ISS migra para IBS no ritmo da transição);
- majoração da presunção pela LC 224/2025;
- alíquotas modais de ICMS por UF;
- prazo da opção Unificado × Híbrido.
