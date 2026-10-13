const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtBrlCurto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const brl = (v: number) => (Number.isFinite(v) ? fmtBrl.format(v) : '—');
export const brlCurto = (v: number) => (Number.isFinite(v) ? fmtBrlCurto.format(v) : '—');
export const pct = (v: number, casas = 2) =>
  `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

/** "16.612,10" → 16612.1 ; aceita também "16612.10" */
export function lerNumero(txt: string): number {
  const limpo = txt.replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
}

export const escreverNumero = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
