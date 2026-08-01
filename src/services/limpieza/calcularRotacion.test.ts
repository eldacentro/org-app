import { describe, expect, it } from 'vitest';
import { Week } from '@definition/week_type';
import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { SchedWeekType } from '@definition/schedules';
import { calcularGrupoReunion } from './calcularRotacion';

/**
 * LA REGLA QUE NO SE PUEDE ROMPER: nadie limpia dos reuniones seguidas.
 *
 * Esto no se comprobaba y se coló un fallo doble —el fin de semana de la semana
 * del Memorial compartía número de orden con el entre semana de la siguiente, y
 * con solo dos grupos la alternancia dejaba al mismo cerrando una vuelta y
 * abriendo la otra—. Las dos cosas se ven a simple vista en el calendario y las
 * dos son inaceptables: el grupo se entera el día de antes.
 */

const grupos = (n: number): FieldServiceGroupType[] =>
  Array.from({ length: n }, (_, i) => ({
    group_id: `g${i + 1}`,
    group_data: {
      name: `Grupo ${i + 1}`,
      sort_index: i,
      members: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  })) as unknown as FieldServiceGroupType[];

// Ojo: `gruposParticipantes: []` NO significa "todos" — una lista vacía es
// truthy y deja la rotación sin grupos. Siempre se pasan los ids de verdad.
const config = (
  n: number,
  over: Partial<LimpiezaConfig> = {}
): LimpiezaConfig => ({
  id: 'limpieza',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fechaInicio: '2026-01-05', // lunes
  grupoInicio: 'g1',
  gruposParticipantes: Array.from({ length: n }, (_, i) => `g${i + 1}`),
  ...over,
});

/** Lunes consecutivos en el formato de la aplicación. */
const semanas = (desde: string, cuantas: number) => {
  const [y, m, d] = desde.split('/').map(Number);
  const cur = new Date(y, m - 1, d);
  const out: string[] = [];

  for (let i = 0; i < cuantas; i++) {
    out.push(
      `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}/${String(cur.getDate()).padStart(2, '0')}`
    );
    cur.setDate(cur.getDate() + 7);
  }

  return out;
};

/** La tira de reuniones que de verdad se celebran, en orden. */
const rotacion = (
  cfg: LimpiezaConfig,
  gs: FieldServiceGroupType[],
  weeks: string[],
  schedules: SchedWeekType[] = []
) => {
  const out: { weekOf: string; dia: string; grupo: string | null }[] = [];

  for (const weekOf of weeks) {
    const sched = schedules.find((s) => s.weekOf === weekOf);

    for (const dia of ['midweek', 'weekend'] as const) {
      const tipo =
        (dia === 'midweek'
          ? sched?.midweek_meeting?.week_type
          : sched?.weekend_meeting?.week_type
        )?.find((r) => r.type === 'main')?.value ?? Week.NORMAL;

      // Una semana sin reunión no aparece en el calendario, así que tampoco aquí.
      if ([Week.ASSEMBLY, Week.CONVENTION, Week.MEMORIAL].includes(tipo))
        continue;

      out.push({
        weekOf,
        dia,
        grupo: calcularGrupoReunion(cfg, weekOf, dia, gs, schedules),
      });
    }
  }

  return out;
};

const sinRepetirSeguidas = (
  tira: { weekOf: string; dia: string; grupo: string | null }[]
) =>
  tira
    .map((r, i) =>
      i > 0 && r.grupo === tira[i - 1].grupo
        ? `${tira[i - 1].weekOf}/${tira[i - 1].dia} y ${r.weekOf}/${r.dia} → ${r.grupo}`
        : null
    )
    .filter(Boolean);

describe('calcularGrupoReunion', () => {
  it.each([2, 3, 4, 5, 6, 7, 8])(
    'con %i grupos nadie limpia dos reuniones seguidas',
    (n) => {
      for (const alternarParejas of [false, true]) {
        const tira = rotacion(
          config(n, { alternarParejas }),
          grupos(n),
          semanas('2026/01/05', 60)
        );

        expect(sinRepetirSeguidas(tira)).toEqual([]);
      }
    }
  );

  it('tampoco cuando una semana se queda sin la reunión de entre semana', () => {
    // El Memorial sustituye a la reunión de entre semana y deja la del fin de
    // semana. La semana aporta UNA reunión, no dos.
    const weeks = semanas('2026/01/05', 40);
    const schedules = [
      {
        weekOf: weeks[6],
        midweek_meeting: {
          week_type: [{ type: 'main', value: Week.MEMORIAL, updatedAt: '' }],
        },
        weekend_meeting: {
          week_type: [{ type: 'main', value: Week.NORMAL, updatedAt: '' }],
        },
      },
    ] as unknown as SchedWeekType[];

    for (const n of [4, 6]) {
      for (const alternarParejas of [false, true]) {
        const tira = rotacion(
          config(n, { alternarParejas }),
          grupos(n),
          weeks,
          schedules
        );

        expect(sinRepetirSeguidas(tira)).toEqual([]);
      }
    }
  });

  it('ni cuando la semana entera se cae por una asamblea', () => {
    const weeks = semanas('2026/01/05', 40);
    const schedules = [
      {
        weekOf: weeks[9],
        midweek_meeting: {
          week_type: [{ type: 'main', value: Week.ASSEMBLY, updatedAt: '' }],
        },
        weekend_meeting: {
          week_type: [{ type: 'main', value: Week.ASSEMBLY, updatedAt: '' }],
        },
      },
    ] as unknown as SchedWeekType[];

    const tira = rotacion(
      config(6, { alternarParejas: true }),
      grupos(6),
      weeks,
      schedules
    );

    expect(sinRepetirSeguidas(tira)).toEqual([]);
  });

  it('reparte por igual: en una vuelta entran todos los grupos una vez', () => {
    const tira = rotacion(
      config(6, { alternarParejas: true }),
      grupos(6),
      semanas('2026/01/05', 30)
    );

    for (let i = 0; i + 6 <= tira.length; i += 6) {
      expect(new Set(tira.slice(i, i + 6).map((r) => r.grupo)).size).toBe(6);
    }
  });

  it('alternar por parejas hace que cada grupo pase por las dos reuniones', () => {
    const tira = rotacion(
      config(6, { alternarParejas: true }),
      grupos(6),
      semanas('2026/01/05', 30)
    );

    for (const g of grupos(6)) {
      const dias = new Set(
        tira.filter((r) => r.grupo === g.group_id).map((r) => r.dia)
      );
      expect(dias).toEqual(new Set(['midweek', 'weekend']));
    }
  });

  it('sin alternar, cada grupo se queda clavado en la misma reunión', () => {
    // Esto no es un fallo, es el motivo por el que existe el interruptor.
    const tira = rotacion(config(6), grupos(6), semanas('2026/01/05', 30));

    for (const g of grupos(6)) {
      const dias = new Set(
        tira.filter((r) => r.grupo === g.group_id).map((r) => r.dia)
      );
      expect(dias.size).toBe(1);
    }
  });

  it('lo puesto a mano manda sobre el cálculo', () => {
    const weeks = semanas('2026/01/05', 4);
    const cfg = config(6, { overrides: { [`${weeks[2]}-weekend`]: 'g5' } });

    expect(calcularGrupoReunion(cfg, weeks[2], 'weekend', grupos(6))).toBe('g5');
  });
});
