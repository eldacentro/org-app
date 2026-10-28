import { describe, expect, it } from 'vitest';
import { conLimite, intentarConLimite, LimiteDeTiempo } from './con_limite';

const nunca = () => new Promise<never>(() => undefined);
const tras = <T>(ms: number, valor: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(valor), ms));

describe('conLimite', () => {
  it('devuelve el valor si llega a tiempo', async () => {
    await expect(conLimite(tras(5, 'ok'), 200)).resolves.toBe('ok');
  });

  it('se rinde con LimiteDeTiempo si la espera no vuelve nunca', async () => {
    await expect(conLimite(nunca(), 20, 'token')).rejects.toBeInstanceOf(
      LimiteDeTiempo
    );
  });

  it('deja pasar el error original si falla antes del límite', async () => {
    const fallo = new Error('red');
    await expect(conLimite(Promise.reject(fallo), 200)).rejects.toBe(fallo);
  });
});

describe('intentarConLimite', () => {
  it('nunca lanza: dice si terminó bien', async () => {
    expect(await intentarConLimite(tras(5, 1), 200)).toBe(true);
    expect(await intentarConLimite(nunca(), 20)).toBe(false);
    expect(await intentarConLimite(Promise.reject(new Error('x')), 200)).toBe(
      false
    );
  });
});
