import { describe, expect, it } from 'vitest';
import { BENEFICIOS, avaliarBeneficios, type EntradaBeneficios } from './beneficios';

const base = (over: Partial<EntradaBeneficios> = {}): EntradaBeneficios => ({
  perfis: ['ecommerce'], volume: 100_000, ufOrigem: 'SP', ufDestino: 'BA', vendedorSimples: false, importado: false, ...over,
});
const por = (id: string, e = base()) => avaliarBeneficios(e).find((a) => a.b.id === id)!;

describe('catálogo de benefícios', () => {
  it('todo benefício tem base legal, fonte com link e ao menos um requisito', () => {
    for (const b of BENEFICIOS) {
      expect(b.baseLegal.length, b.id).toBeGreaterThan(5);
      expect(b.fonte.url, b.id).toMatch(/^https:\/\//);
      expect(b.requisitos.length, b.id).toBeGreaterThan(0);
    }
  });

  it('ids únicos', () => {
    expect(new Set(BENEFICIOS.map((b) => b.id)).size).toBe(BENEFICIOS.length);
  });
});

describe('avaliação', () => {
  it('TTD 478 (SC → BA, 7%): carga de 2,4% contra 7% saindo de SP', () => {
    const a = por('sc-ttd478');
    expect(a.cargaBeneficio).toBeCloseTo(0.024, 10);
    expect(a.icmsHoje).toBeCloseTo(7_000, 2);          // SP → BA: 7%
    expect(a.icmsComBeneficio).toBeCloseTo(2_400, 2);
    expect(a.economia).toBeCloseTo(4_600, 2);
  });

  it('Prodepe: 47,5% de crédito sobre os 4% de importados = carga de 2,1%', () => {
    const a = por('pe-prodepe-importador', base({ perfis: ['importador'] }));
    expect(a.cargaBeneficio).toBeCloseTo(0.021, 10);
  });

  it('aderentes ao perfil vêm primeiro, ordenados pela economia', () => {
    const r = avaliarBeneficios(base());
    const aderentes = r.filter((a) => a.aderente);
    expect(r.slice(0, aderentes.length).every((a) => a.aderente)).toBe(true);
    const comValor = aderentes.filter((a) => a.economia !== null);
    for (let i = 1; i < comValor.length; i++) expect(comValor[i - 1].economia!).toBeGreaterThanOrEqual(comValor[i].economia!);
  });

  it('Simples: sem economia calculada e com alerta de regime', () => {
    const a = por('es-compete-ecommerce', base({ vendedorSimples: true }));
    expect(a.economia).toBeNull();
    expect(a.alertas.join(' ')).toContain('Lucro Presumido ou Real');
  });

  it('benefício sem percentual confirmado não inventa economia', () => {
    expect(por('go-ecommerce').economia).toBeNull();
  });
});
