import { describe, expect, it } from 'vitest';
import { sellarLosQueCambian } from '@services/dexie/responsabilidades';
import { ResponsabilidadesType } from '@definition/responsabilidades';

/**
 * Qué departamento se tocó y cuándo.
 *
 * Antes la fecha de un departamento solo se ponía al CREARLO: al cambiarle el
 * responsable después seguía diciendo la fecha del día que se creó, así que el
 * panel de «Última actualización» enseñaba fechas de nacimiento haciéndolas
 * pasar por fechas de cambio.
 *
 * Y el filo del arreglo es el contrario: sellarlos todos en cada guardado haría
 * que el panel dijera «hoy cambió todo», que es justo lo que se vino a quitar.
 */

const AHORA = '2026-08-05T20:41:00.000Z';
const VIEJO = '2026-01-10T10:00:00.000Z';

type Deps = ResponsabilidadesType['departamentos'];

const dep = (id: string, responsable: string, updatedAt = VIEJO, by?: string) =>
  ({
    id,
    name: id,
    type: 'simple',
    responsable,
    updatedAt,
    ...(by ? { by } : {}),
  }) as unknown as Deps[number];

describe('sellar solo lo que cambia', () => {
  it('al que cambia le pone la fecha y el autor', () => {
    const [salida] = sellarLosQueCambian(
      [dep('d1', 'uid-nuevo')],
      [dep('d1', 'uid-viejo')],
      AHORA,
      'Ana Pérez'
    );

    expect(salida.updatedAt).toBe(AHORA);
    expect(salida.by).toBe('Ana Pérez');
  });

  it('al que NO cambia no le toca ni la fecha ni el autor', () => {
    // Es lo que evita el «hoy cambió todo» cada vez que se guarda la página.
    const [salida] = sellarLosQueCambian(
      [dep('d1', 'uid-a', VIEJO, 'Carlos')],
      [dep('d1', 'uid-a', VIEJO, 'Carlos')],
      AHORA,
      'Ana Pérez'
    );

    expect(salida.updatedAt).toBe(VIEJO);
    expect(salida.by).toBe('Carlos');
  });

  it('con varios, solo se sella el tocado', () => {
    const salida = sellarLosQueCambian(
      [dep('d1', 'uid-nuevo'), dep('d2', 'uid-b')],
      [dep('d1', 'uid-a'), dep('d2', 'uid-b')],
      AHORA,
      'Ana Pérez'
    );

    expect(salida.map((d) => d.updatedAt)).toEqual([AHORA, VIEJO]);
  });

  it('uno nuevo se sella entero', () => {
    const [salida] = sellarLosQueCambian(
      [dep('d9', 'uid-x')],
      [],
      AHORA,
      'Ana Pérez'
    );

    expect(salida.updatedAt).toBe(AHORA);
    expect(salida.by).toBe('Ana Pérez');
  });

  it('cambiar solo la fecha a mano no cuenta como cambio', () => {
    // Se compara el contenido, no las marcas: si no, cada guardado se
    // retroalimentaría y todo saldría tocado siempre.
    const [salida] = sellarLosQueCambian(
      [dep('d1', 'uid-a', '2026-05-05T00:00:00.000Z')],
      [dep('d1', 'uid-a', VIEJO, 'Carlos')],
      AHORA,
      'Ana Pérez'
    );

    expect(salida.updatedAt).toBe(VIEJO);
    expect(salida.by).toBe('Carlos');
  });
});
