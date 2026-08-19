import { describe, expect, it } from 'vitest';
import { buildShareUrl, parseShareHash } from './territory_share';
import { congIdFromShort, congIdToShort } from '@services/encryption/share';

/**
 * Los enlaces públicos de territorio.
 *
 * Estos enlaces se mandan por WhatsApp y viven días en el móvil de alguien. Si
 * el lector deja de entender un formato, esa persona se queda con un enlace
 * muerto y sin forma de saber por qué — así que lo que se prueba aquí es sobre
 * todo que los ANTIGUOS siguen abriéndose.
 */

const ORIGIN = 'https://eldacentro.com';
const CONG = '51D3B450-18F6-4A4B-907F-F79953240DF7';
const TOKEN = 'bTJ3Q1hyZjhLcDBuVw';
const CLAVE = 'M3ZzRXdxTDlhUjJiVA';

describe('el identificador de congregación, en corto', () => {
  it('va y vuelve sin perder nada', () => {
    expect(congIdFromShort(congIdToShort(CONG))).toBe(CONG);
  });

  it('en corto ocupa 22 caracteres en vez de 36', () => {
    // Es el trozo más largo del enlace, y era puro relleno: un UUID gasta 36
    // caracteres para guardar 16 bytes.
    expect(CONG).toHaveLength(36);
    expect(congIdToShort(CONG)).toHaveLength(22);
  });

  it('un UUID de un enlace antiguo se deja tal cual', () => {
    expect(congIdFromShort(CONG)).toBe(CONG);
  });

  it('lo que no sea un identificador reconocible no se toca', () => {
    expect(congIdToShort('cualquier-otra-cosa')).toBe('cualquier-otra-cosa');
  });
});

describe('leer un enlace', () => {
  it('entiende el formato nuevo', () => {
    const parsed = parseShareHash(
      `#/t/${congIdToShort(CONG)}/${TOKEN}/${CLAVE}`
    );

    expect(parsed).toEqual({ congId: CONG, token: TOKEN, keyB64: CLAVE });
  });

  it('SIGUE entendiendo los que ya circulan', () => {
    // Lo que de verdad importa: alguien tiene este enlace en el móvil desde
    // hace días y tiene que seguir abriéndose hasta que caduque solo.
    const parsed = parseShareHash(`#/t/${CONG}/${TOKEN}?k=${CLAVE}`);

    expect(parsed).toEqual({ congId: CONG, token: TOKEN, keyB64: CLAVE });
  });

  it('lo que no es un enlace de territorio no se lee', () => {
    expect(parseShareHash('#/otra/cosa')).toBeNull();
    expect(parseShareHash('#/t/solo-uno')).toBeNull();
    expect(parseShareHash('')).toBeNull();
  });
});

describe('componer un enlace', () => {
  it('sale en el formato corto', () => {
    const url = buildShareUrl(ORIGIN, CONG, TOKEN, CLAVE);

    expect(url).toBe(`${ORIGIN}/#/t/${congIdToShort(CONG)}/${TOKEN}/${CLAVE}`);
  });

  it('lo que se compone se puede volver a leer', () => {
    const url = buildShareUrl(ORIGIN, CONG, TOKEN, CLAVE);
    const parsed = parseShareHash(url.slice(url.indexOf('#')));

    expect(parsed).toEqual({ congId: CONG, token: TOKEN, keyB64: CLAVE });
  });

  it('y es bastante más corto que el de antes', () => {
    const nuevo = buildShareUrl(ORIGIN, CONG, TOKEN, CLAVE);
    const viejo = `${ORIGIN}/#/t/${CONG}/${TOKEN}?k=${CLAVE}`;

    expect(nuevo.length).toBeLessThan(viejo.length);
  });
});
