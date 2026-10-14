import { describe, expect, it } from 'vitest';
import { FILTRO_PADRAO, OPERACAO_PADRAO, codificarPacote, decodificarPacote } from './estado';
import { EXEMPLOS } from './exemplos';

describe('link de compartilhamento', () => {
  it('ida e volta preserva os dados, inclusive acentos', () => {
    const p = { entrada: { ...EXEMPLOS[1].entrada, nomeEmpresa: 'Comércio São João Ltda.' }, operacao: OPERACAO_PADRAO, filtro: FILTRO_PADRAO, contrato: { valor: 5000 } };
    const txt = codificarPacote(p);
    expect(txt).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodificarPacote(txt)).toEqual(p);
  });

  it('link inválido ou adulterado não carrega nada', () => {
    expect(decodificarPacote('não-é-base64')).toBeNull();
    expect(decodificarPacote(codificarPacote({ entrada: { atividade: 'x' } as never, operacao: OPERACAO_PADRAO, filtro: FILTRO_PADRAO }))).toBeNull();
  });
});
