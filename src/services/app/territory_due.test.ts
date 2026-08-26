import { describe, it, expect } from 'vitest';
import { dueAtDeAsignacion, estaAtrasada } from './territories';

/**
 * Cuándo vence un territorio es lo que el hermano lee en su móvil y lo que
 * decide si sale en rojo como atrasado. Con la fórmula general, un territorio
 * de una campaña de dos semanas decía "vence el 24 de diciembre".
 */
const campanas = [
  { id: 'c1', fechaFin: '2026-09-30T00:00:00.000Z' },
  { id: 'c2', fechaFin: '2026-06-15T00:00:00.000Z' },
];

describe('cuándo vence una asignación', () => {
  it('la normal, a los días de la configuración', () => {
    const vence = dueAtDeAsignacion(
      { assignedAt: '2026-08-26T10:00:00.000Z' },
      campanas,
      30
    );

    expect(vence.slice(0, 10)).toBe('2026-09-25');
  });

  it('la de campaña, el día en que termina la campaña', () => {
    const vence = dueAtDeAsignacion(
      { assignedAt: '2026-08-26T10:00:00.000Z', campaignId: 'c1' },
      campanas,
      120
    );

    expect(vence.slice(0, 10)).toBe('2026-09-30');
  });

  it('y vence al FINAL de ese día, no al empezarlo', () => {
    // Si venciera a medianoche, el último día de campaña ya nacería atrasado
    // y se perdería una jornada entera de predicación.
    const vence = new Date(
      dueAtDeAsignacion(
        { assignedAt: '2026-08-26T10:00:00.000Z', campaignId: 'c1' },
        campanas,
        120
      )
    );
    const manana = new Date('2026-09-30T09:00:00.000Z');

    expect(vence > manana).toBe(true);
  });

  it('si la campaña ya no existe, se cae a la fórmula', () => {
    const vence = dueAtDeAsignacion(
      { assignedAt: '2026-08-26T10:00:00.000Z', campaignId: 'borrada' },
      campanas,
      30
    );

    expect(vence.slice(0, 10)).toBe('2026-09-25');
  });
});

describe('atrasada', () => {
  const ahora = new Date('2026-10-05T12:00:00.000Z');

  it('manda la fecha de vencimiento, no la fórmula', () => {
    // Asignada hace poco pero de una campaña que ya terminó: está atrasada
    // aunque por la fórmula le quedaran meses.
    expect(
      estaAtrasada(
        {
          assignedAt: '2026-09-20T10:00:00.000Z',
          dueAt: '2026-09-30T23:59:59.999Z',
        },
        120,
        ahora
      )
    ).toBe(true);
  });

  it('la devuelta nunca está atrasada', () => {
    expect(
      estaAtrasada(
        {
          assignedAt: '2026-01-01T10:00:00.000Z',
          dueAt: '2026-02-01T10:00:00.000Z',
          returnedAt: '2026-01-15T10:00:00.000Z',
        },
        30,
        ahora
      )
    ).toBe(false);
  });

  it('sin fecha guardada, la fórmula de siempre', () => {
    expect(
      estaAtrasada({ assignedAt: '2026-10-01T10:00:00.000Z' }, 30, ahora)
    ).toBe(false);
    expect(
      estaAtrasada({ assignedAt: '2026-01-01T10:00:00.000Z' }, 30, ahora)
    ).toBe(true);
  });
});
