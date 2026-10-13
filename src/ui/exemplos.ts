import { ATIVIDADES, AVANCADO_PADRAO, ICMS_UF, type Entrada } from '../motor';

const base = (uf: string): Pick<Entrada, 'uf' | 'avancado'> => ({ uf, avancado: { ...AVANCADO_PADRAO, aliqIcms: ICMS_UF[uf] } });

/** Empresas fictícias para demonstração, escolhidas para mostrar resultados diferentes. */
export const EXEMPLOS: { id: string; nome: string; resumo: string; entrada: Entrada }[] = [
  {
    id: 'loja', nome: 'Loja de varejo', resumo: 'Simples, vende ao consumidor final',
    entrada: {
      nomeEmpresa: 'Loja de varejo (exemplo)', atividade: 'comercio', regimeAtual: 'SN_UNIFICADO', ...base('SP'),
      faturamentoMensal: 50_000, folhaMensal: 8_000, comprasMensais: 30_000,
      margemLucro: ATIVIDADES.comercio.margemPadrao, percVendasEmpresas: 0.2,
    },
  },
  {
    id: 'industria', nome: 'Indústria de embalagens', resumo: 'Simples, vende quase só para empresas',
    entrada: {
      nomeEmpresa: 'Indústria de embalagens (exemplo)', atividade: 'industria', regimeAtual: 'SN_UNIFICADO', ...base('MG'),
      faturamentoMensal: 250_000, folhaMensal: 45_000, comprasMensais: 150_000,
      margemLucro: 0.06, percVendasEmpresas: 0.95,
    },
  },
  {
    id: 'distribuidora', nome: 'Distribuidora atacadista', resumo: 'Presumido, margem baixa',
    entrada: {
      nomeEmpresa: 'Distribuidora atacadista (exemplo)', atividade: 'comercio', regimeAtual: 'PRESUMIDO', ...base('SP'),
      faturamentoMensal: 380_000, folhaMensal: 35_000, comprasMensais: 300_000,
      margemLucro: 0.03, percVendasEmpresas: 0.9,
    },
  },
  {
    id: 'atacado', nome: 'Atacado regional', resumo: 'Simples, com ponto de virada',
    entrada: {
      nomeEmpresa: 'Atacado regional (exemplo)', atividade: 'comercio', regimeAtual: 'SN_UNIFICADO', ...base('SP'),
      faturamentoMensal: 280_000, folhaMensal: 30_000, comprasMensais: 220_000,
      margemLucro: 0.03, percVendasEmpresas: 0.9,
    },
  },
  {
    id: 'clinica', nome: 'Clínica médica', resumo: 'Saúde, redução de 60% no IBS/CBS',
    entrada: {
      nomeEmpresa: 'Clínica médica (exemplo)', atividade: 'saude', regimeAtual: 'SN_UNIFICADO', ...base('PR'),
      faturamentoMensal: 90_000, folhaMensal: 30_000, comprasMensais: 12_000,
      margemLucro: 0.3, percVendasEmpresas: 0.1,
    },
  },
];
