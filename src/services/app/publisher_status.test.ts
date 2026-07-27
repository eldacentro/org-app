import { describe, expect, it } from 'vitest';
import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import {
  activityWindowStart,
  buildPublisherHistoryUpdates,
  buildMinistryMonthsIndex,
  currentActivityMonth,
  monthAdd,
  personBecameInactiveDuring,
  personIsActivePublisher,
  personIsInactivePublisher,
  personWasPublisherBy,
} from './publisher_status';

/**
 * Publicador activo / inactivo.
 *
 * Esto decide quién sale en los filtros de Informes de predicación, quién
 * lleva la marca de "inactivo" en su ficha, quién aparece en Grupos de
 * predicación y —lo más delicado— el número de publicadores activos que se
 * manda a la sucursal. Equivocarse aquí no rompe la app: da un número
 * plausible y equivocado, que es peor.
 *
 * La regla, una sola: activo = ha informado participación en la predicación
 * al menos una vez en los últimos 6 meses, contando el mes en curso.
 */

const stamp = '2026-01-01T00:00:00Z';

type Tramo = { start_date: string; end_date?: string | null; _deleted?: boolean };

const buildPerson = (
  tramos: Tramo[],
  overrides: {
    uid?: string;
    baptized?: boolean;
    unbaptized?: boolean;
    midweek?: boolean;
    firstReport?: string;
  } = {}
): PersonType =>
  ({
    person_uid: overrides.uid ?? 'p1',
    _deleted: { value: false, updatedAt: stamp },
    person_data: {
      person_firstname: { value: 'Nombre', updatedAt: stamp },
      person_lastname: { value: 'Apellido', updatedAt: stamp },
      first_report: { value: overrides.firstReport ?? '', updatedAt: stamp },
      midweek_meeting_student: {
        active: { value: overrides.midweek ?? false, updatedAt: stamp },
        history: [],
      },
      publisher_baptized: {
        active: { value: overrides.baptized ?? true, updatedAt: stamp },
        history: tramos.map((t, i) => ({
          id: `h${i}`,
          _deleted: t._deleted ?? false,
          updatedAt: stamp,
          start_date: t.start_date,
          end_date: t.end_date ?? null,
        })),
      },
      publisher_unbaptized: {
        active: { value: overrides.unbaptized ?? false, updatedAt: stamp },
        history: [],
      },
    },
  }) as unknown as PersonType;

const buildReport = (
  uid: string,
  month: string,
  overrides: { shared?: boolean; deleted?: boolean } = {}
): CongFieldServiceReportType =>
  ({
    report_id: `${uid}-${month}`,
    report_data: {
      _deleted: overrides.deleted ?? false,
      updatedAt: stamp,
      report_date: month,
      person_uid: uid,
      shared_ministry: overrides.shared ?? true,
      hours: { field_service: 0, credit: { value: 0, approved: 0 } },
      bible_studies: 0,
      status: 'confirmed',
    },
  }) as unknown as CongFieldServiceReportType;

// Publicador de siempre, nombrado hace años.
const veterano = (uid = 'p1') => buildPerson([{ start_date: '2015-03-01' }], { uid });

// Mes de referencia de casi todas las pruebas: julio de 2026.
// Ventana de 6 meses → 2026/02 … 2026/07.
const JULIO = '2026/07';

describe('la ventana de 6 meses', () => {
  it('empieza cinco meses antes del mes evaluado', () => {
    expect(activityWindowStart('2026/07')).toBe('2026/02');
  });

  it('cruza el cambio de año sin despeinarse', () => {
    expect(activityWindowStart('2026/02')).toBe('2025/09');
    expect(monthAdd('2026/01', -1)).toBe('2025/12');
    expect(monthAdd('2025/12', 1)).toBe('2026/01');
    expect(monthAdd('2026/07', -18)).toBe('2025/01');
  });

  it('el mes en curso es el del calendario', () => {
    expect(currentActivityMonth(new Date(2026, 6, 27))).toBe('2026/07');
    expect(currentActivityMonth(new Date(2026, 0, 1))).toBe('2026/01');
  });
});

describe('la regla', () => {
  const persona = veterano();

  it('informar el mes en curso lo mantiene activo', () => {
    const reports = [buildReport('p1', '2026/07')];

    expect(personIsActivePublisher(persona, reports, JULIO)).toBe(true);
    expect(personIsInactivePublisher(persona, reports, JULIO)).toBe(false);
  });

  it('un informe en el mes más antiguo de la ventana todavía cuenta', () => {
    const reports = [buildReport('p1', '2026/02')];

    expect(personIsActivePublisher(persona, reports, JULIO)).toBe(true);
  });

  it('un mes antes de la ventana ya no cuenta: queda inactivo', () => {
    const reports = [buildReport('p1', '2026/01')];

    expect(personIsActivePublisher(persona, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(persona, reports, JULIO)).toBe(true);
  });

  it('saltarse un mes (o cinco) NO lo hace inactivo', () => {
    // informó en febrero y nada más: sigue activo en julio
    const reports = [buildReport('p1', '2026/02')];

    for (const month of ['2026/03', '2026/04', '2026/05', '2026/06', JULIO]) {
      expect(personIsActivePublisher(persona, reports, month)).toBe(true);
    }

    // en agosto se le sale febrero de la ventana
    expect(personIsActivePublisher(persona, reports, '2026/08')).toBe(false);
  });

  it('vuelve a estar activo en cuanto informa, sin tocar nada más', () => {
    const inactivo = [buildReport('p1', '2025/06')];
    expect(personIsInactivePublisher(persona, inactivo, JULIO)).toBe(true);

    const reactivado = [...inactivo, buildReport('p1', JULIO)];
    expect(personIsActivePublisher(persona, reactivado, JULIO)).toBe(true);
  });

  it('un informe SIN participación cuenta como no haber informado', () => {
    const reports = [
      buildReport('p1', JULIO, { shared: false }),
      buildReport('otro', JULIO),
    ];

    expect(personIsInactivePublisher(persona, reports, JULIO)).toBe(true);
  });

  it('un informe borrado no reactiva a nadie', () => {
    const reports = [
      buildReport('p1', JULIO, { deleted: true }),
      buildReport('otro', JULIO),
    ];

    expect(personIsInactivePublisher(persona, reports, JULIO)).toBe(true);
  });

  it('el informe de otra persona no le sirve', () => {
    const reports = [buildReport('otro', JULIO)];

    expect(personIsInactivePublisher(persona, reports, JULIO)).toBe(true);
  });
});

describe('quién entra en el reparto activos/inactivos', () => {
  const reports = [buildReport('otro', JULIO)];

  it('quien NUNCA fue publicador no está ni activo ni inactivo', () => {
    // El caso de Víctor Saca: sin historial de publicador y sin la casilla
    // marcada, aparecía en "inactivos" solo por no ser estudiante.
    const nunca = buildPerson([], { baptized: false });

    expect(personWasPublisherBy(nunca, JULIO)).toBe(false);
    expect(personIsActivePublisher(nunca, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(nunca, reports, JULIO)).toBe(false);
  });

  it('un estudiante de la reunión de entresemana tampoco', () => {
    const estudiante = buildPerson([], { baptized: false, midweek: true });

    expect(personIsInactivePublisher(estudiante, reports, JULIO)).toBe(false);
  });

  it('quien fue publicador y lo dejó SÍ cuenta como inactivo', () => {
    const exPublicador = buildPerson([
      { start_date: '2015-03-01', end_date: '2025-06-30' },
    ]);

    expect(personIsInactivePublisher(exPublicador, reports, JULIO)).toBe(true);
  });

  it('todavía no era publicador en un mes anterior a su nombramiento', () => {
    const nuevo = buildPerson([{ start_date: '2026-05-01' }]);

    expect(personWasPublisherBy(nuevo, '2026/04')).toBe(false);
    expect(personIsInactivePublisher(nuevo, reports, '2026/04')).toBe(false);
  });

  it('un tramo borrado no convierte a nadie en publicador', () => {
    const persona = buildPerson([{ start_date: '2015-03-01', _deleted: true }], {
      baptized: false,
    });

    expect(personWasPublisherBy(persona, JULIO)).toBe(false);
  });

  it('la casilla de la ficha vale mientras no haya tramo grabado', () => {
    const reciente = buildPerson([], { baptized: true });

    expect(personWasPublisherBy(reciente, JULIO)).toBe(true);
  });
});

describe('alta de una persona nueva', () => {
  // Marcar "Publicador bautizado" ABRE el periodo en el historial (ver
  // openPeriod, en utils/spiritual_status), así que un alta hecha desde la app
  // siempre tiene fecha y le toca la cortesía del recién nombrado.
  const reports = [buildReport('otro', JULIO)];

  it('marcado como publicador sin NINGUNA fecha: inactivo, no activo eterno', () => {
    // Antes se daba por activo "en la duda", y la duda no caducaba nunca:
    // Rogelio Beltrán e Israel Angioli llevaban tres años sin un solo informe
    // y no había manera de que salieran como inactivos.
    const sinFecha = buildPerson([], { baptized: true });

    expect(personIsActivePublisher(sinFecha, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(sinFecha, reports, JULIO)).toBe(true);
  });

  it('el alta de verdad sí trae fecha, y por eso cuenta como activo', () => {
    const nuevo = buildPerson([{ start_date: '2026-07-01' }], {
      baptized: true,
    });

    expect(personIsActivePublisher(nuevo, reports, JULIO)).toBe(true);
  });

  it('en cuanto tiene fecha de primer informe, se le aplica la regla', () => {
    const conFecha = buildPerson([], { baptized: true, firstReport: '2025-10-01' });

    expect(personWasPublisherBy(conFecha, JULIO)).toBe(true);
    expect(personIsInactivePublisher(conFecha, reports, JULIO)).toBe(true);
  });

  it('la fecha de primer informe reciente lo mantiene activo', () => {
    const conFecha = buildPerson([], { baptized: true, firstReport: '2026-06-01' });

    expect(personIsActivePublisher(conFecha, reports, JULIO)).toBe(true);
  });

  it('sin la casilla y sin fechas no es publicador de ninguna manera', () => {
    const nadie = buildPerson([], { baptized: false });

    expect(personIsActivePublisher(nadie, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(nadie, reports, JULIO)).toBe(false);
  });

  it('un estudiante marcado además como publicador cuenta como publicador', () => {
    // Datos antiguos: las dos casillas no pueden convivir desde la ficha, pero
    // si aparecen, dejar a alguien fuera de los informes es el error caro.
    const mixto = buildPerson([{ start_date: '2026-06-01' }], {
      baptized: true,
      midweek: true,
    });

    expect(personWasPublisherBy(mixto, JULIO)).toBe(true);
  });
});

describe('casos que rompían antes', () => {
  it('marcarlo inactivo cerrando el tramo este mismo mes NO lo deja activo', () => {
    // El caso de Antonio Bernabéu: al marcarlo inactivo se cerró su tramo con
    // fecha del mes en curso, así que "¿el tramo cubre este mes?" seguía
    // diciendo que sí y salía en activos y no en inactivos.
    const antonio = buildPerson([
      { start_date: '2015-03-01', end_date: '2026-07-15' },
    ]);

    const reports = [buildReport('p1', '2025/11')];

    expect(personIsActivePublisher(antonio, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(antonio, reports, JULIO)).toBe(true);
  });

  it('un tramo abierto no basta para estar activo si no informa', () => {
    // El caso de David Such: se le deja el tramo abierto para que siga
    // apareciendo en Grupos de predicación, y por eso salía en Informes.
    const david = buildPerson([{ start_date: '2015-03-01' }]);

    const reports = [buildReport('p1', '2025/09'), buildReport('otro', JULIO)];

    expect(personIsInactivePublisher(david, reports, JULIO)).toBe(true);
  });

  it('al recién nombrado no le da tiempo a informar y ya cuenta como activo', () => {
    const nuevo = buildPerson([{ start_date: '2026-07-05' }]);

    const reports = [buildReport('otro', JULIO)];

    expect(personIsActivePublisher(nuevo, reports, JULIO)).toBe(true);

    // pero si pasan seis meses sin un solo informe, se queda inactivo
    expect(personIsInactivePublisher(nuevo, reports, '2027/01')).toBe(true);
  });

  it('un tramo CERRADO dentro de la ventana no da la cortesía del recién nombrado', () => {
    // Esto es lo que pasaba de verdad en la congregación, y anulaba el envío
    // del S-1: al cerrar el tramo de quien lleva 6 meses sin informar, la
    // fecha de INICIO de ese mismo tramo caía dentro de la ventana y lo
    // devolvía a la lista de activos. El cierre no servía de nada.
    const antonio = buildPerson([
      { start_date: '2023-11-01', end_date: '2026-07-11' },
      { start_date: '2026-06-30', end_date: '2026-07-16' },
    ]);

    const reports = [buildReport('p1', '2025/11')];

    expect(personIsActivePublisher(antonio, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(antonio, reports, JULIO)).toBe(true);
  });

  it('sin un solo informe y con el tramo cerrado, está inactivo', () => {
    // El caso de David Such: alta en abril, tramo cerrado en julio, ninguna
    // participación informada nunca.
    const david = buildPerson([
      { start_date: '2026-04-30', end_date: '2026-07-20' },
    ], { firstReport: '2026-04-30' });

    const reports = [buildReport('otro', JULIO)];

    expect(personIsActivePublisher(david, reports, JULIO)).toBe(false);
    expect(personIsInactivePublisher(david, reports, JULIO)).toBe(true);
  });

  it('pero con el tramo ABIERTO y recién nombrado sigue estando activo', () => {
    const nuevo = buildPerson([{ start_date: '2026-06-30' }], {
      firstReport: '2026-06-30',
    });

    const reports = [buildReport('otro', JULIO)];

    expect(personIsActivePublisher(nuevo, reports, JULIO)).toBe(true);
  });

  it('el alta a medio rellenar (sin historial) conserva la cortesía', () => {
    const aMedias = buildPerson([], { firstReport: '2026-07-01' });

    const reports = [buildReport('otro', JULIO)];

    expect(personIsActivePublisher(aMedias, reports, JULIO)).toBe(true);
  });

  it('una fecha guardada como día 1 local no se va al mes anterior', () => {
    // La app guarda el día 1 en hora local, y en verano eso se serializa como
    // '…-30T22:00:00.000Z'. Recortar el texto lo dejaba en el mes ANTERIOR: el
    // alta de mayo contaba como de abril. En la congregación había 20 fechas
    // así, y una de ellas puede caer al otro lado de un año de servicio.
    const nuevo = buildPerson([{ start_date: '2026-04-30T22:00:00.000Z' }]);

    expect(personWasPublisherBy(nuevo, '2026/04')).toBe(false);
    expect(personWasPublisherBy(nuevo, '2026/05')).toBe(true);
  });

  it('quien reanuda tras una baja vuelve a contar desde su nuevo tramo', () => {
    const vuelve = buildPerson([
      { start_date: '2015-03-01', end_date: '2024-05-31' },
      { start_date: '2026-06-01' },
    ]);

    const reports = [buildReport('otro', JULIO)];

    expect(personIsActivePublisher(vuelve, reports, JULIO)).toBe(true);
  });
});

describe('salvaguarda: sin informes cargados no se declara inactivo a nadie', () => {
  it('un dispositivo a medio sincronizar da a todos por activos', () => {
    const persona = veterano();

    expect(personIsActivePublisher(persona, [], JULIO)).toBe(true);
    expect(personIsInactivePublisher(persona, [], JULIO)).toBe(false);
  });

  it('pero en cuanto hay informes de alguien, la regla se aplica', () => {
    const persona = veterano();
    const reports = [buildReport('otro', JULIO)];

    expect(personIsInactivePublisher(persona, reports, JULIO)).toBe(true);
  });
});

describe('paso a inactivo durante un año de servicio (S-10)', () => {
  // año de servicio 2026: 2025/09 → 2026/08
  const START = '2025/09';
  const END = '2026/08';

  it('cuenta a quien se quedó inactivo dentro del año', () => {
    // último informe en 2025/10 → se queda inactivo en 2026/04
    const persona = veterano();
    const reports = [buildReport('p1', '2025/10')];

    expect(personBecameInactiveDuring(persona, reports, START, END)).toBe(true);
  });

  it('no cuenta a quien ya llevaba inactivo desde antes del año', () => {
    const persona = veterano();
    const reports = [buildReport('p1', '2024/03')];

    expect(personBecameInactiveDuring(persona, reports, START, END)).toBe(false);
  });

  it('no cuenta a quien sigue informando', () => {
    const persona = veterano();
    const reports = [
      buildReport('p1', '2025/10'),
      buildReport('p1', '2026/03'),
      buildReport('p1', '2026/07'),
    ];

    expect(personBecameInactiveDuring(persona, reports, START, END)).toBe(false);
  });

  it('quien se quedó inactivo y volvió sigue contando: pasó por ahí', () => {
    const persona = veterano();
    const reports = [buildReport('p1', '2025/09'), buildReport('p1', '2026/06')];

    expect(personBecameInactiveDuring(persona, reports, START, END)).toBe(true);
  });
});

describe('el índice de meses con participación', () => {
  it('agrupa por persona y descarta lo que no cuenta', () => {
    const index = buildMinistryMonthsIndex([
      buildReport('p1', '2026/06'),
      buildReport('p1', '2026/07'),
      buildReport('p1', '2026/05', { shared: false }),
      buildReport('p1', '2026/04', { deleted: true }),
      buildReport('p2', '2026/07'),
    ]);

    expect([...index.get('p1')]).toEqual(['2026/06', '2026/07']);
    expect([...index.get('p2')]).toEqual(['2026/07']);
    expect(index.size).toBe(2);
  });

  it('se puede reutilizar en vez de recorrer los informes por persona', () => {
    const index = buildMinistryMonthsIndex([buildReport('p1', JULIO)]);

    expect(personIsActivePublisher(veterano(), index, JULIO)).toBe(true);
    expect(personIsActivePublisher(veterano('p2'), index, JULIO)).toBe(false);
  });
});

describe('el historial que deja el S-1 al enviarlo', () => {
  const FIN = '2026-07-31T21:59:59.999Z';
  const INICIO = '2026-06-30T22:00:00.000Z';

  const actualizar = (active, inactive) =>
    buildPublisherHistoryUpdates({
      active,
      inactive,
      endDate: FIN,
      startDate: INICIO,
    });

  it('cierra el tramo de quien consta como inactivo', () => {
    const persona = buildPerson([{ start_date: '2015-03-01' }]);

    const [guardada] = actualizar([], [persona]);

    expect(
      guardada.person_data.publisher_baptized.history[0].end_date
    ).toBe(FIN);
  });

  it('REABRE el de quien consta como activo y lo tenía cerrado', () => {
    // El caso de Andrés y Loli Argente: siguen informando, alguien les cerró
    // el tramo, y arreglarlo había que hacerlo a mano ficha por ficha.
    const persona = buildPerson([
      { start_date: '2023-08-01', end_date: '2026-05-18' },
    ]);

    const [guardada] = actualizar([persona], []);

    const history = guardada.person_data.publisher_baptized.history;

    expect(history).toHaveLength(2);
    expect(history[1].end_date).toBeNull();
    expect(history[1].start_date).toBe(INICIO);
  });

  it('no toca a quien ya está como debe, en ninguno de los dos lados', () => {
    const activaOk = buildPerson([{ start_date: '2015-03-01' }], { uid: 'a' });
    const inactivaOk = buildPerson(
      [{ start_date: '2015-03-01', end_date: '2026-01-31' }],
      { uid: 'b' }
    );

    // Guardar un registro idéntico despierta la sincronización de toda la
    // congregación para nada.
    expect(actualizar([activaOk], [inactivaOk])).toHaveLength(0);
  });

  it('sin ninguna casilla puesta no se inventa un tramo', () => {
    const sinCasilla = buildPerson(
      [{ start_date: '2015-03-01', end_date: '2026-05-18' }],
      { baptized: false }
    );

    expect(actualizar([sinCasilla], [])).toHaveLength(0);
  });

  it('el tramo reabierto nunca se solapa con el cierre anterior', () => {
    const persona = buildPerson([
      { start_date: '2023-08-01', end_date: '2026-07-20T10:00:00.000Z' },
    ]);

    const [guardada] = actualizar([persona], []);

    const history = guardada.person_data.publisher_baptized.history;

    // INICIO es el día 1 de julio, anterior al cierre del día 20.
    expect(history[1].start_date).toBe('2026-07-20T10:00:00.000Z');
  });
});
