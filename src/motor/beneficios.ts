/**
 * Catálogo de benefícios estaduais de ICMS (levantamento de 14/10/2026, ampliado no mesmo dia).
 *
 * Cada item traz a base legal e a fonte consultada. As cargas são de referência,
 * vindas da norma ou de consultas e materiais técnicos, e devem ser confirmadas
 * com um contador e no termo de concessão antes de qualquer adesão.
 * Todos os benefícios de ICMS terminam com o imposto, até 31/12/2032
 * (LC 160/2017; EC 132/2023).
 */
import { aliquotaInterestadual } from './icms';

export type PerfilOperacao = 'ecommerce' | 'importador' | 'atacadista' | 'industria';

export const PERFIS: { id: PerfilOperacao; rotulo: string; desc: string }[] = [
  { id: 'ecommerce', rotulo: 'Vendo pela internet', desc: 'Para consumidor final de outros estados' },
  { id: 'importador', rotulo: 'Importo para revender', desc: 'Mercadoria estrangeira' },
  { id: 'atacadista', rotulo: 'Atacado ou distribuição', desc: 'Venda para outras empresas' },
  { id: 'industria', rotulo: 'Indústria', desc: 'Fabricação própria' },
];

export interface Beneficio {
  id: string;
  uf: string;
  nome: string;
  tipo: string;
  perfis: PerfilOperacao[];
  /** operações alcançadas, em linguagem simples */
  operacao: string;
  /** a quais vendas a carga de referência se aplica */
  aplicaA: 'consumidor_final' | 'interestadual' | 'importados';
  cargaTexto: string;
  /** carga efetiva de ICMS sobre a venda interestadual; ausente quando as fontes não permitem quantificar */
  carga?: (interestadual: number) => number;
  exigeRegimeNormal: boolean;
  requisitos: string[];
  cuidados: string[];
  baseLegal: string;
  fonte: { rotulo: string; url: string };
}

/** Fundos estaduais cobrados junto com os TTDs de SC (FUMDES e outros), em torno de 0,4%. */
const FUNDOS_SC = 0.004;

export const BENEFICIOS: Beneficio[] = [
  {
    id: 'sc-ttd478', uf: 'SC', nome: 'TTD 478 · comércio eletrônico', tipo: 'Crédito presumido',
    perfis: ['ecommerce'],
    operacao: 'Vendas interestaduais pela internet ou telemarketing a consumidor final não contribuinte.',
    aplicaA: 'consumidor_final',
    cargaTexto: 'Crédito de 75% (4%), 71,43% (7%) ou 83,33% (12%) do débito: carga de 1% a 2%, mais cerca de 0,4% de fundos.',
    carga: (i) => (i <= 0.04 ? 0.01 : 0.02) + FUNDOS_SC,
    exigeRegimeNormal: true,
    requisitos: [
      'Estabelecimento (sede ou filial) em Santa Catarina',
      'Vendas não presenciais a consumidor final de outros estados',
      'Regime especial concedido pela SEF/SC',
      'Estorno dos créditos efetivos e apuração separada',
    ],
    cuidados: [
      'O DIFAL continua devido ao estado de destino',
      'Não se acumula com outro crédito presumido na mesma operação',
    ],
    baseLegal: 'RICMS/SC, Anexo 2, art. 21, XV',
    fonte: { rotulo: 'Consulta SEF/SC 026/2020', url: 'https://legislacao.sef.sc.gov.br/Consulta/Views/Publico/DocumentoLegalViewer.ashx?id=06EDC646-82A1-409A-9199-A148BEB8CC48' },
  },
  {
    id: 'sc-ttd409', uf: 'SC', nome: 'TTD 409, 410 e 411 · importação', tipo: 'Diferimento + crédito presumido',
    perfis: ['importador'],
    operacao: 'Importação com desembaraço em SC e revenda para outros estados (alíquota de 4%).',
    aplicaA: 'importados',
    cargaTexto: 'ICMS diferido no desembaraço e carga final de 1% da base integral nas saídas a 4%, mais cerca de 0,4% de fundos.',
    carga: () => 0.01 + FUNDOS_SC,
    exigeRegimeNormal: true,
    requisitos: [
      'Desembaraço aduaneiro em Santa Catarina',
      'Termo de concessão (TTD) emitido pela SEF/SC',
      'TTD 410 exige 24 meses no 409; TTD 411 exige garantias',
    ],
    cuidados: [
      'A carga varia por produto (ex.: aço, cobre e alumínio) e pela fase do benefício',
      'Não pode ser usado junto com o TTD 478 na mesma operação',
    ],
    baseLegal: 'RICMS/SC, Anexo 2, art. 246; Lei 17.763/2019',
    fonte: { rotulo: 'Consulta COPAT 5/2025', url: 'https://www.legisweb.com.br/legislacao/?id=475080' },
  },
  {
    id: 'es-compete-ecommerce', uf: 'ES', nome: 'Compete-ES · comércio eletrônico', tipo: 'Crédito presumido',
    perfis: ['ecommerce'],
    operacao: 'Vendas interestaduais não presenciais a consumidor final não contribuinte.',
    aplicaA: 'consumidor_final',
    cargaTexto: 'Crédito presumido para que a carga efetiva fique em 1,1%.',
    carga: () => 0.011,
    exigeRegimeNormal: true,
    requisitos: [
      'Unidade no Espírito Santo com CNAE de comércio varejista',
      'Lucro Presumido ou Real (não vale para o Simples)',
      'NF-e em todas as operações e certidão negativa estadual',
      'Contrato de competitividade com o estado',
    ],
    cuidados: ['O DIFAL continua devido ao estado de destino'],
    baseLegal: 'Lei estadual 10.568/2016 (Compete-ES)',
    fonte: { rotulo: 'Lei 10.568/2016 (ALES)', url: 'https://www3.al.es.gov.br/arquivo/documents/legislacao/html/lei105682016.html' },
  },
  {
    id: 'es-compete-atacado', uf: 'ES', nome: 'Compete-ES · atacadista', tipo: 'Crédito presumido',
    perfis: ['atacadista'],
    operacao: 'Saídas interestaduais de atacadistas.',
    aplicaA: 'interestadual',
    cargaTexto: 'Carga efetiva de 1,1% nas saídas interestaduais (crédito presumido desde 2024).',
    carga: () => 0.011,
    exigeRegimeNormal: true,
    requisitos: [
      'Unidade no Espírito Santo, que pode ser filial',
      'CNAE principal de comércio atacadista',
      'Contrato de competitividade com o estado',
    ],
    cuidados: ['Se a venda for a consumidor final, o DIFAL continua devido ao destino'],
    baseLegal: 'Lei estadual 10.568/2016, art. 16',
    fonte: { rotulo: 'Lei 10.568/2016 (ALES)', url: 'https://www3.al.es.gov.br/arquivo/documents/legislacao/html/lei105682016.html' },
  },
  {
    id: 'mg-tts-ecommerce', uf: 'MG', nome: 'TTS · comércio eletrônico', tipo: 'Crédito presumido (regime especial)',
    perfis: ['ecommerce'],
    operacao: 'Vendas por internet ou telemarketing a consumidor final, inclusive dentro de MG.',
    aplicaA: 'consumidor_final',
    cargaTexto: 'Cerca de 1,3% nas vendas para outros estados; nas internas, 6% (nacionais) ou 14% (importados), segundo análises técnicas.',
    carga: () => 0.013,
    exigeRegimeNormal: true,
    requisitos: [
      'Estabelecimento em Minas Gerais, sem venda em balcão',
      'Lucro Presumido ou Real',
      'No mínimo 30% das vendas a consumidor final de outros estados nos 6 meses anteriores',
      'Pedido de regime especial pelo SIARE ou e-PTARE',
    ],
    cuidados: ['O DIFAL continua devido ao estado de destino', 'Empresa nova recebe o regime em caráter precário por 6 meses'],
    baseLegal: 'RICMS/MG (Decreto 48.589/2023); Resolução SEF 5.793/2024',
    fonte: { rotulo: 'Resolução SEF/MG 5.793/2024', url: 'https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/resolucoes/2024/rr5793_2024.html' },
  },
  {
    id: 'pe-prodepe-importador', uf: 'PE', nome: 'Prodepe · importador atacadista', tipo: 'Diferimento + crédito presumido',
    perfis: ['importador', 'atacadista'],
    operacao: 'Importação por atacadista ou trading em PE e revenda para outros estados.',
    aplicaA: 'importados',
    cargaTexto: 'ICMS diferido na importação e crédito presumido de 47,5% do débito nas saídas interestaduais.',
    carga: (i) => i * (1 - 0.475),
    exigeRegimeNormal: true,
    requisitos: [
      'Importador atacadista ou trading estabelecido em Pernambuco',
      'Diferimento só para produtos sem fabricação local (edital de não concorrência)',
      'Decreto de concessão do estado',
    ],
    cuidados: ['Os percentuais do decreto de cada empresa podem ser diferentes'],
    baseLegal: 'Lei estadual 11.675/1999 (Prodepe)',
    fonte: { rotulo: 'ADEPE · Prodepe', url: 'https://www.adepe.pe.gov.br/invista-em-pernambuco/incentivos-fiscais/prodepe/' },
  },
  {
    id: 'go-ecommerce', uf: 'GO', nome: 'Crédito outorgado · comércio eletrônico', tipo: 'Crédito outorgado',
    perfis: ['ecommerce'],
    operacao: 'Estabelecimento que faça só vendas interestaduais não presenciais a consumidor final não contribuinte.',
    aplicaA: 'consumidor_final',
    cargaTexto: 'Percentual a confirmar no texto vigente do RCTE (houve alteração em 2026).',
    exigeRegimeNormal: true,
    requisitos: [
      'Operação exclusivamente por internet para consumidor final de outros estados',
      'Comprovação de investimentos no estado (IN GSE 1.554/2023)',
    ],
    cuidados: ['O DIFAL continua devido ao estado de destino'],
    baseLegal: 'RCTE/GO, Anexo IX, art. 11, LXXVI, "a"; Decreto 10.201/2023',
    fonte: { rotulo: 'Governo de Goiás', url: 'https://goias.gov.br/casacivil/governo-de-goias-concede-incentivo-fiscal-para-empresas-de-e-commerce/' },
  },
  {
    id: 'go-atacadista', uf: 'GO', nome: 'Crédito outorgado · atacadista e indústria', tipo: 'Crédito outorgado e redução de base',
    perfis: ['atacadista', 'industria'],
    operacao: 'Saídas interestaduais de atacadistas e indústrias; redução de base nas internas.',
    aplicaA: 'interestadual',
    cargaTexto: 'Percentual a confirmar. Nas internas, carga mínima de 10% (indústria) a 10,5% ou 11% (atacado), conforme a fonte.',
    exigeRegimeNormal: true,
    requisitos: [
      'Atacadista ou indústria em Goiás',
      'Varejista pode se equiparar com 30% das saídas para revenda ou industrialização',
    ],
    cuidados: ['Pode exigir Termo de Acordo de Regime Especial (TARE)'],
    baseLegal: 'RCTE/GO, Anexo IX, art. 11, III',
    fonte: { rotulo: 'Parecer GEOT 41/2020', url: 'https://www.legisweb.com.br/legislacao/?id=466884' },
  },
  {
    id: 'pr-importacao', uf: 'PR', nome: 'Paraná Competitivo · importação', tipo: 'Crédito presumido',
    perfis: ['importador'],
    operacao: 'Revenda de mercadoria importada por portos e aeroportos do Paraná, com desembaraço no estado.',
    aplicaA: 'importados',
    cargaTexto: 'Crédito presumido até a carga mínima de 1,5% nas saídas a 4% (redação consolidada mais recente; a original previa 1%). Usamos 1,5%.',
    carga: (i) => (i <= 0.04 ? 0.015 : 0.025),
    exigeRegimeNormal: true,
    requisitos: [
      'Estabelecimento no Paraná',
      'Importação por portos ou aeroportos paranaenses, com desembaraço no estado',
      'NCM fora da lista de impedidos (Resolução SEFA 304/2025)',
    ],
    cuidados: [
      'Substitui os demais créditos e não se acumula com outro benefício',
      'Exige depósito de percentual em fundo até fevereiro do ano seguinte (Decreto 9.083/2025)',
    ],
    baseLegal: 'Decreto 7.721/2024, art. 14 (Programa Paraná Competitivo)',
    fonte: { rotulo: 'Decreto 7.721/2024 (SEFA/PR)', url: 'https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202407721.pdf' },
  },
  {
    id: 'pr-ecommerce', uf: 'PR', nome: 'Paraná Competitivo · comércio eletrônico', tipo: 'Crédito presumido (regime especial)',
    perfis: ['ecommerce'],
    operacao: 'Quem opera só por comércio eletrônico, com vendas a consumidor final de outros estados.',
    aplicaA: 'consumidor_final',
    cargaTexto: 'Percentual a confirmar no regime especial concedido (Decreto 7.721/2024).',
    exigeRegimeNormal: true,
    requisitos: ['Estabelecimento no Paraná', 'Operação exclusivamente por comércio eletrônico', 'Regime especial concedido pela SEFA/PR'],
    cuidados: ['Alguns regimes de e-commerce venceram em 30/09/2026: confira a renovação'],
    baseLegal: 'Decreto 7.721/2024 (Programa Paraná Competitivo)',
    fonte: { rotulo: 'Decreto 7.721/2024 (SEFA/PR)', url: 'https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202407721.pdf' },
  },
  {
    id: 'to-internet', uf: 'TO', nome: 'Lei da Internet · comércio eletrônico', tipo: 'Crédito presumido',
    perfis: ['ecommerce'],
    operacao: 'Empresa que vende exclusivamente pela internet ou por correspondência a consumidor final de outros estados.',
    aplicaA: 'consumidor_final',
    cargaTexto: 'Crédito presumido para o ICMS ficar em 1% das vendas para outros estados; 2% para mercadoria importada.',
    carga: (i) => (i <= 0.04 ? 0.02 : 0.01),
    exigeRegimeNormal: true,
    requisitos: [
      'Inscrição no cadastro de contribuintes do Tocantins',
      'Venda exclusivamente pela internet ou por correspondência',
      'Permanecer estabelecida e operando no estado por pelo menos 5 anos',
    ],
    cuidados: ['O DIFAL continua devido ao estado de destino', 'Vigência até 31/12/2032 segundo fontes secundárias: confirmar'],
    baseLegal: 'Lei 1.641/2005 (TO)',
    fonte: { rotulo: 'Governo do Tocantins · incentivos fiscais', url: 'https://www.to.gov.br/sics/incentivos-fiscais/6b9wypu38j6p' },
  },
  {
    id: 'ba-desenvolve', uf: 'BA', nome: 'Desenvolve · indústria', tipo: 'Dilação de prazo do ICMS',
    perfis: ['industria'],
    operacao: 'Projetos industriais aprovados: parte do ICMS próprio é paga anos depois, com desconto na antecipação.',
    aplicaA: 'interestadual',
    cargaTexto: 'Dilação de até 90% do saldo devedor mensal do ICMS, por até 72 meses; o percentual depende da classe do projeto. Não reduz a alíquota.',
    exigeRegimeNormal: true,
    requisitos: [
      'Estabelecimento industrial na Bahia',
      'Projeto aprovado pelo Conselho Deliberativo do Desenvolve',
      'Classe do projeto define o percentual e o prazo',
    ],
    cuidados: ['Ganho financeiro (prazo e desconto), não redução direta de carga', 'Antecipação exige 10% do desconto ao Fundo de Combate à Pobreza'],
    baseLegal: 'Lei 7.980/2001 e Decreto 8.205/2002 (BA)',
    fonte: { rotulo: 'CONSEF/BA · Acórdão CJF 0154-12/25', url: 'http://mbusca.sefaz.ba.gov.br/consef/2025%20-%20ac%C3%B3rd%C3%A3os%20c%C3%A2maras/A-0154-12.25-VD.pdf' },
  },
];

export interface EntradaBeneficios {
  perfis: PerfilOperacao[];
  /** vendas mensais para outros estados alcançadas pelo benefício */
  volume: number;
  ufOrigem: string;
  ufDestino: string;
  vendedorSimples: boolean;
  importado: boolean;
}

export interface AvaliacaoBeneficio {
  b: Beneficio;
  aderente: boolean;
  /** ICMS de origem hoje, saindo do estado atual */
  icmsHoje: number | null;
  aliqHoje: number;
  /** ICMS de origem com o benefício */
  icmsComBeneficio: number | null;
  cargaBeneficio: number | null;
  economia: number | null;
  alertas: string[];
}

export function avaliarBeneficios(e: EntradaBeneficios): AvaliacaoBeneficio[] {
  const lista = BENEFICIOS.map((b): AvaliacaoBeneficio => {
    const aderente = b.perfis.some((p) => e.perfis.includes(p));
    const importado = e.importado || b.aplicaA === 'importados';
    const aliqHoje = aliquotaInterestadual(e.ufOrigem, e.ufDestino, importado);
    const inter = aliquotaInterestadual(b.uf, e.ufDestino, importado);
    const cargaBeneficio = b.carga && e.ufDestino !== b.uf ? b.carga(inter) : null;
    const icmsHoje = e.ufDestino !== e.ufOrigem ? e.volume * aliqHoje : null;
    const icmsComBeneficio = cargaBeneficio !== null ? e.volume * cargaBeneficio : null;
    const economia = icmsHoje !== null && icmsComBeneficio !== null && !e.vendedorSimples ? icmsHoje - icmsComBeneficio : null;
    const alertas: string[] = [];
    if (e.vendedorSimples && b.exigeRegimeNormal) alertas.push('Exige Lucro Presumido ou Real: no Simples o ICMS está no DAS');
    if (e.ufOrigem !== b.uf) alertas.push(`Exige estabelecimento em ${b.uf}: hoje você vende de ${e.ufOrigem}`);
    if (e.ufDestino === b.uf) alertas.push(`Seu destino principal é o próprio ${b.uf}: o benefício vale para vendas a outros estados`);
    return { b, aderente, icmsHoje, aliqHoje, icmsComBeneficio, cargaBeneficio, economia, alertas };
  });
  return lista.sort((x, y) =>
    Number(y.aderente) - Number(x.aderente) ||
    (y.economia ?? -Infinity) - (x.economia ?? -Infinity) ||
    x.b.uf.localeCompare(y.b.uf));
}
