import { describe, expect, it } from 'vitest';
import {
  pruneSeenApplications,
  solicitudesQueAvisan,
} from './applications_seen';

describe('pruneSeenApplications', () => {
  it('conserva las que siguen pendientes', () => {
    expect(pruneSeenApplications(['a', 'b'], ['a', 'b', 'c'])).toEqual([
      'a',
      'b',
    ]);
  });

  it('olvida las que ya no están pendientes', () => {
    expect(pruneSeenApplications(['a', 'b'], ['b'])).toEqual(['b']);
  });

  it('una solicitud nueva no hereda el visto de la anterior', () => {
    // Se borró la solicitud 'a' y el hermano volvió a firmar: identificador
    // nuevo, así que no está en el registro y tiene que volver a avisar.
    const seen = pruneSeenApplications(['a'], ['a-nueva']);

    expect(seen).toEqual([]);
    expect(seen.includes('a-nueva')).toBe(false);
  });

  it('devuelve el mismo array si no hay nada que quitar', () => {
    const seen = ['a', 'b'];

    expect(pruneSeenApplications(seen, ['a', 'b'])).toBe(seen);
  });

  // La regresión que hacía reaparecer el aviso en cada arranque: al abrir la
  // aplicación las solicitudes aún no han bajado, la lista de pendientes está
  // vacía por eso, y limpiar contra ella borraba el registro entero.
  it('sin pendientes NO se toca el registro (aún no han bajado)', () => {
    const seen = ['a', 'b'];

    expect(pruneSeenApplications(seen, [])).toBe(seen);
  });
});

describe('solicitudesQueAvisan', () => {
  const hoy = new Date(2026, 9, 28); // octubre de 2026

  const base = {
    request_id: 'r1',
    person_uid: 'p1',
    months: ['2026/11'],
    continuous: false,
  };

  const avisan = (
    solicitudes: Parameters<typeof solicitudesQueAvisan>[0]['solicitudes'],
    extra: Partial<Parameters<typeof solicitudesQueAvisan>[0]> = {}
  ) =>
    solicitudesQueAvisan({
      solicitudes,
      vistas: [],
      misPapeles: ['secretary'],
      personas: [],
      hoy,
      ...extra,
    }).map((s) => s.request_id);

  it('avisa de una pendiente en la que me toca decidir', () => {
    expect(avisan([base])).toEqual(['r1']);
  });

  it('no avisa de las ya vistas o quitadas del aviso', () => {
    expect(avisan([base], { vistas: ['r1'] })).toEqual([]);
  });

  it('no avisa si yo ya he dicho lo mío, aunque falte otro', () => {
    expect(avisan([{ ...base, secretary: 'approved' }])).toEqual([]);
    expect(
      avisan([{ ...base, secretary: 'approved' }], {
        misPapeles: ['service_overseer'],
      })
    ).toEqual(['r1']);
  });

  it('a un administrador sin papel le avisa mientras falte alguno', () => {
    const todas = {
      ...base,
      coordinator: 'approved' as const,
      secretary: 'approved' as const,
    };
    expect(avisan([todas], { misPapeles: ['admin'] })).toEqual(['r1']);
    expect(
      avisan([{ ...todas, service_overseer: 'approved' as const }], {
        misPapeles: ['admin'],
      })
    ).toEqual([]);
  });

  it('no avisa si todos los meses ya pasaron, salvo que sea continua', () => {
    const pasada = { ...base, months: ['2026/08', '2026/09'] };
    expect(avisan([pasada])).toEqual([]);
    expect(avisan([{ ...pasada, continuous: true }])).toEqual(['r1']);
    // El mes en curso todavía cuenta.
    expect(avisan([{ ...base, months: ['2026/10'] }])).toEqual(['r1']);
  });

  it('no avisa si ya consta como auxiliar en todos los meses que pide', () => {
    const conFicha = (start_date: string, end_date: string | null) => [
      {
        person_uid: 'p1',
        person_data: {
          enrollments: [
            { enrollment: 'AP', start_date, end_date, _deleted: false },
          ],
        },
      },
    ];

    expect(
      avisan([base], { personas: conFicha('2026/11/01', '2026/11/30') })
    ).toEqual([]);
    // Inscripción abierta, sin fecha de fin.
    expect(avisan([base], { personas: conFicha('2026/09/01', null) })).toEqual(
      []
    );
    // Solo cubre uno de los dos meses: sigue avisando.
    expect(
      avisan([{ ...base, months: ['2026/11', '2026/12'] }], {
        personas: conFicha('2026/11/01', '2026/11/30'),
      })
    ).toEqual(['r1']);
  });

  it('una inscripción borrada no cuenta', () => {
    expect(
      avisan([base], {
        personas: [
          {
            person_uid: 'p1',
            person_data: {
              enrollments: [
                {
                  enrollment: 'AP',
                  start_date: '2026/11/01',
                  end_date: '2026/11/30',
                  _deleted: true,
                },
              ],
            },
          },
        ],
      })
    ).toEqual(['r1']);
  });
});
