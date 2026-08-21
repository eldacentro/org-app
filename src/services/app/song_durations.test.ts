import { describe, expect, it } from 'vitest';
import {
  parseSongDurations,
  songDurationsStale,
  songDurationsUrl,
  SONG_DURATIONS_STALE_MS,
} from './song_durations';

/**
 * Las duraciones de los canciones.
 *
 * La respuesta es de jw.org y no la controlamos: lo que se comprueba aquí es que
 * un cambio de formato al otro lado se traduzca en «no hay duraciones» —y que la
 * reunión siga funcionando como siempre— y nunca en un número inventado, que es
 * lo que haría que la canción se pasara sola antes de tiempo.
 */

/** Recortado de la respuesta real de jw.org (español, 2026-08). */
const RESPUESTA = {
  category: {
    key: 'VODSJJMeetings',
    media: [
      {
        naturalKey: 'pub-sjjm_S_1_VIDEO',
        title: '1. Las cualidades principales de Jehová',
        duration: 140.864,
      },
      {
        naturalKey: 'pub-sjjm_S_77_VIDEO',
        title: '77. Luz en un mundo oscuro',
        duration: 200.064,
      },
      {
        naturalKey: 'pub-sjjm_S_163_VIDEO',
        title: '163. Ya puedo ver',
        duration: 232.5323,
      },
    ],
  },
};

describe('leer la respuesta de jw.org', () => {
  it('saca el número y los segundos de cada canción', () => {
    const seconds = parseSongDurations(RESPUESTA);

    expect(seconds[1]).toBe(141);
    expect(seconds[77]).toBe(200);
    expect(seconds[163]).toBe(233);
  });

  it('el número sale de la CLAVE, no del título', () => {
    // El título va traducido y su formato cambia con el idioma; la clave no.
    const seconds = parseSongDurations({
      category: {
        media: [
          {
            naturalKey: 'pub-sjjm_E_12_VIDEO',
            title: 'Sin número',
            duration: 60,
          },
        ],
      },
    });

    expect(seconds[12]).toBe(60);
  });

  it('lo que no se entiende se queda fuera en vez de colarse como cero', () => {
    const seconds = parseSongDurations({
      category: {
        media: [
          { naturalKey: 'pub-sjjm_S_5_VIDEO', duration: 0 },
          { naturalKey: 'otra-cosa', duration: 100 },
          { naturalKey: 'pub-sjjm_S_6_VIDEO' },
          { naturalKey: 'pub-sjjm_S_7_VIDEO', duration: 'tres minutos' },
        ],
      },
    });

    expect(seconds).toEqual({});
  });

  it('una respuesta de otra forma no revienta: simplemente no hay duraciones', () => {
    expect(parseSongDurations(undefined)).toEqual({});
    expect(parseSongDurations({})).toEqual({});
    expect(parseSongDurations({ category: {} })).toEqual({});
    expect(parseSongDurations({ category: { media: 'nada' } })).toEqual({});
  });
});

describe('cuándo se vuelven a pedir', () => {
  const ahora = new Date(2026, 7, 21, 12, 0, 0).getTime();

  it('sin nada guardado, se piden', () => {
    expect(songDurationsStale(null, ahora)).toBe(true);
  });

  it('recién pedidas, no', () => {
    expect(
      songDurationsStale(
        {
          langCode: 'S',
          seconds: { 1: 141 },
          fetchedAt: new Date(ahora).toISOString(),
        },
        ahora
      )
    ).toBe(false);
  });

  it('pasado el mes, sí — que si sale una canción nuevo nadie va a venir a pulsar un botón', () => {
    expect(
      songDurationsStale(
        {
          langCode: 'S',
          seconds: { 1: 141 },
          fetchedAt: new Date(
            ahora - SONG_DURATIONS_STALE_MS - 1000
          ).toISOString(),
        },
        ahora
      )
    ).toBe(true);
  });

  it('una fecha rota cuenta como que no hay nada', () => {
    expect(
      songDurationsStale(
        { langCode: 'S', seconds: { 1: 141 }, fetchedAt: 'el martes' },
        ahora
      )
    ).toBe(true);
  });
});

describe('a dónde se piden', () => {
  it('la dirección lleva el idioma de la congregación', () => {
    expect(songDurationsUrl('S')).toContain('/v1/categories/S/VODSJJMeetings');
    expect(songDurationsUrl('E')).toContain('/v1/categories/E/VODSJJMeetings');
  });
});
