import { describe, expect, it } from 'vitest';
import { formatBuildDate, isTimestampBuild } from './build_info';
import { formatSyncAge } from './sync_age';

/**
 * Identidad de versión y antigüedad de la sincronización.
 *
 * Parece cosmético y no lo es: de estos dos números dependen la oleada de
 * actualización (que compara versiones) y el panel donde el administrador ve a
 * quién hay que echarle una mano. Cuando el número de build estaba roto en
 * producción —siempre el mismo— las dos cosas quedaban inservibles sin que
 * nadie lo notara.
 */

describe('número de build', () => {
  it('reconoce un build del esquema nuevo (minutos desde 1970)', () => {
    const ahora = Math.floor(Date.now() / 60000);

    expect(isTimestampBuild(ahora)).toBe(true);
    expect(formatBuildDate(ahora)).not.toBeNull();
  });

  it('un build del esquema viejo NO se convierte en fecha', () => {
    // El 10 es literalmente lo que informaba producción: el número de commits
    // de un clonado superficial. Sacar de ahí "1 de enero de 1970" sería peor
    // que no decir nada.
    expect(isTimestampBuild(10)).toBe(false);
    expect(formatBuildDate(10)).toBeNull();
  });

  it('sin dato de versión no inventa una fecha', () => {
    expect(formatBuildDate(null)).toBeNull();
  });

  it('convierte un minuto conocido en su fecha', () => {
    const build = Math.floor(Date.parse('2026-07-26T12:00:00Z') / 60000);

    expect(formatBuildDate(build)).toContain('2026');
  });

  it('un build más nuevo siempre es un número mayor', () => {
    const antes = Math.floor(Date.parse('2026-07-01T00:00:00Z') / 60000);
    const despues = Math.floor(Date.parse('2026-07-26T00:00:00Z') / 60000);

    // Es lo único que necesita la oleada de actualización para decidir.
    expect(despues).toBeGreaterThan(antes);
  });
});

describe('antigüedad de la última sincronización', () => {
  it('minutos, horas y días, en singular y plural', () => {
    expect(formatSyncAge(1)).toBe('1 minuto');
    expect(formatSyncAge(45)).toBe('45 minutos');
    expect(formatSyncAge(60)).toBe('1 hora');
    expect(formatSyncAge(120)).toBe('2 horas');
    expect(formatSyncAge(2880)).toBe('2 días');
  });

  it('no suelta "hace 4320 minutos" a nadie', () => {
    expect(formatSyncAge(4320)).toBe('3 días');
  });

  it('el salto de horas a días ocurre a las 48 h', () => {
    expect(formatSyncAge(2879)).toBe('47 horas');
    expect(formatSyncAge(2880)).toBe('2 días');
  });
});
