import { describe, expect, it } from 'vitest';
import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import {
  buildTrashEntries,
  planPurge,
  planRestore,
  purgedOnRestore,
} from './persons_trash';

/**
 * La papelera de Personas.
 *
 * Esto decide si unos datos EXISTEN o no, y el error tiene las dos caras
 * malas: no devolver lo que se pidió, o devolver a quien no tocaba. Además
 * todo lo que sale de aquí se propaga por sincronización a los ~30
 * dispositivos de la congregación, así que no hay vuelta atrás.
 *
 * Lo que se prueba es el núcleo PURO. Guardar en Dexie no se prueba porque no
 * decide nada: `restorePersonFromTrash` lee, llama a `planRestore` y guarda lo
 * que salga por los helpers que ya ponen `send_local` y `rev`.
 */

const BORRADO = '2026-08-01T10:00:00.000Z';
const AHORA = '2026-08-09T12:00:00.000Z';

const buildPerson = (
  uid: string,
  deleted: PersonType['_deleted'],
  overrides: Partial<PersonType['person_data']> = {}
): PersonType =>
  ({
    person_uid: uid,
    _deleted: deleted,
    person_data: {
      person_firstname: { value: 'Nombre', updatedAt: BORRADO },
      person_lastname: { value: uid, updatedAt: BORRADO },
      person_display_name: { value: uid, updatedAt: BORRADO },
      publisher_baptized: {
        active: { value: false, updatedAt: BORRADO },
        history: [],
      },
      publisher_unbaptized: {
        active: { value: false, updatedAt: BORRADO },
        history: [],
      },
      enrollments: [],
      ...overrides,
    },
  }) as unknown as PersonType;

const buildReport = (
  id: string,
  uid: string,
  month: string,
  deleted = false
): CongFieldServiceReportType =>
  ({
    report_id: id,
    report_data: {
      _deleted: deleted,
      updatedAt: BORRADO,
      rev: BORRADO,
      report_date: month,
      person_uid: uid,
      hours: { field_service: 5, credit: { value: 0, approved: 0 } },
    },
  }) as unknown as CongFieldServiceReportType;

describe('quien está en la papelera no sale en ninguna otra lista', () => {
  it('el filtro «Archivado» no devuelve a quien además está borrado', async () => {
    // `applyNameFilters` recibe la tabla ENTERA cuando el filtro está puesto
    // —con las lápidas dentro—, así que era el único sitio de la app donde
    // reaparecía alguien ya eliminado.
    const { applyNameFilters } = await import('./persons');

    const archivado = buildPerson(
      'archivado',
      { value: false, updatedAt: '' },
      { archived: { value: true, updatedAt: BORRADO } } as never
    );

    const archivadoYBorrado = buildPerson(
      'archivadoYBorrado',
      { value: true, updatedAt: BORRADO },
      { archived: { value: true, updatedAt: BORRADO } } as never
    );

    const result = applyNameFilters({
      persons: [],
      searchKey: '',
      archived: true,
      allPersons: [archivado, archivadoYBorrado],
    });

    expect(result.map((p) => p.person_uid)).toEqual(['archivado']);
  });
});

describe('buildTrashEntries', () => {
  it('solo trae a quien tiene lápida', () => {
    const vivo = buildPerson('vivo', { value: false, updatedAt: '' });
    const borrado = buildPerson('borrado', {
      value: true,
      updatedAt: BORRADO,
    });

    const entries = buildTrashEntries([vivo, borrado], []);

    expect(entries).toHaveLength(1);
    expect(entries[0].person.person_uid).toBe('borrado');
  });

  it('lo más recientemente borrado va primero', () => {
    const antiguo = buildPerson('antiguo', {
      value: true,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    const reciente = buildPerson('reciente', {
      value: true,
      updatedAt: BORRADO,
    });

    const entries = buildTrashEntries([antiguo, reciente], []);

    expect(entries.map((e) => e.person.person_uid)).toEqual([
      'reciente',
      'antiguo',
    ]);
  });

  it('cuenta los informes vivos y los borrados de cada uno, por separado', () => {
    const borrado = buildPerson('A', { value: true, updatedAt: BORRADO });

    const entries = buildTrashEntries(
      [borrado],
      [
        buildReport('r1', 'A', '2026/01'),
        buildReport('r2', 'A', '2026/02'),
        buildReport('r3', 'A', '2026/03', true),
        buildReport('r4', 'B', '2026/01'),
      ]
    );

    expect(entries[0].reportsAlive).toBe(2);
    expect(entries[0].reportsDeleted).toBe(1);
  });

  it('un borrado antiguo, sin `by`, no se inventa un culpable', () => {
    const entries = buildTrashEntries(
      [buildPerson('A', { value: true, updatedAt: BORRADO })],
      []
    );

    expect(entries[0].deletedBy).toBe('');
  });

  it('trae el `by` cuando lo hay', () => {
    const entries = buildTrashEntries(
      [buildPerson('A', { value: true, updatedAt: BORRADO, by: 'uid-carlos' })],
      []
    );

    expect(entries[0].deletedBy).toBe('uid-carlos');
  });
});

describe('planRestore', () => {
  const persona = buildPerson('A', { value: true, updatedAt: BORRADO });

  it('quita la lápida y la SELLA con la hora de ahora', () => {
    // Lo importante de las cuatro cosas que hay que hacer: en el servidor está
    // el borrado, con su fecha. Sin resellar volvería a ganar la fusión y la
    // persona desaparecería otra vez en la sincronización siguiente.
    const plan = planRestore(persona, [], AHORA);

    expect(plan.person._deleted.value).toBe(false);
    expect(plan.person._deleted.updatedAt).toBe(AHORA);
    expect(plan.person._deleted.updatedAt > BORRADO).toBe(true);
  });

  it('no toca el registro original', () => {
    planRestore(persona, [], AHORA);

    expect(persona._deleted.value).toBe(true);
    expect(persona._deleted.updatedAt).toBe(BORRADO);
  });

  it('devuelve sus informes borrados, sellados y con `rev` al día', () => {
    // `rev` es la copia en claro por donde compara el servidor: sin ponerla,
    // el servidor se queda con su versión —la borrada— y la restauración no
    // sale nunca del dispositivo.
    const plan = planRestore(
      persona,
      [buildReport('r1', 'A', '2026/01', true)],
      AHORA
    );

    expect(plan.reports).toHaveLength(1);
    expect(plan.reports[0].report_data._deleted).toBe(false);
    expect(plan.reports[0].report_data.updatedAt).toBe(AHORA);
    expect(plan.reports[0].report_data.rev).toBe(AHORA);
  });

  it('no reescribe los informes que ya estaban vivos', () => {
    // Los informes de alguien borrado se quedan VIVOS y huérfanos: al volver
    // la persona reaparecen solos. Reescribirlos sería propagar una edición
    // por sincronización sin que hubiera cambiado nada.
    const plan = planRestore(
      persona,
      [buildReport('r1', 'A', '2026/01'), buildReport('r2', 'A', '2026/02')],
      AHORA
    );

    expect(plan.reports).toHaveLength(0);
  });

  it('NUNCA toca los informes de otra persona', () => {
    // Se casa por person_uid, no por texto. El nombre de un hermano aparece
    // dentro de los registros de otros, y restaurar a quien no toca es el
    // fallo que esta pantalla no se puede permitir.
    const plan = planRestore(
      persona,
      [
        buildReport('r1', 'A', '2026/01', true),
        buildReport('r2', 'otro', '2026/01', true),
      ],
      AHORA
    );

    expect(plan.reports.map((r) => r.report_id)).toEqual(['r1']);
  });
});

describe('planPurge — borrar para siempre', () => {
  it('retira la fila de la persona y pone lápida a sus informes', () => {
    // Dos tratos distintos porque el servidor guarda cada tabla de una manera:
    // la de personas la reemplaza entera (quitar la fila la quita de allí), y
    // los informes los fusiona registro a registro (una fila que se quita no
    // le dice nada, así que hace falta la lápida).
    const plan = planPurge(
      [buildPerson('A', { value: true, updatedAt: BORRADO })],
      [buildReport('r1', 'A', '2026/01')],
      ['A'],
      AHORA
    );

    expect(plan.personUids).toEqual(['A']);
    expect(plan.reports).toHaveLength(1);
    expect(plan.reports[0].report_data._deleted).toBe(true);
    expect(plan.reports[0].report_data.updatedAt).toBe(AHORA);
    expect(plan.reports[0].report_data.rev).toBe(AHORA);
  });

  it('NUNCA toca a quien no tiene ya la lápida puesta', () => {
    // Borrar para siempre es una operación sobre la papelera, no un atajo
    // para saltarse el paso de eliminar. Aunque llegue el identificador de
    // alguien vivo, aquí no se le toca.
    const plan = planPurge(
      [
        buildPerson('vivo', { value: false, updatedAt: '' }),
        buildPerson('enPapelera', { value: true, updatedAt: BORRADO }),
      ],
      [buildReport('r1', 'vivo', '2026/01')],
      ['vivo', 'enPapelera'],
      AHORA
    );

    expect(plan.personUids).toEqual(['enPapelera']);
    expect(plan.reports).toHaveLength(0);
  });

  it('no reescribe informes que ya tenían lápida', () => {
    const plan = planPurge(
      [buildPerson('A', { value: true, updatedAt: BORRADO })],
      [buildReport('r1', 'A', '2026/01', true)],
      ['A'],
      AHORA
    );

    expect(plan.personUids).toEqual(['A']);
    expect(plan.reports).toHaveLength(0);
  });

  it('no toca los informes de otra persona', () => {
    const plan = planPurge(
      [
        buildPerson('A', { value: true, updatedAt: BORRADO }),
        buildPerson('B', { value: true, updatedAt: BORRADO }),
      ],
      [buildReport('r1', 'A', '2026/01'), buildReport('r2', 'B', '2026/01')],
      ['A'],
      AHORA
    );

    expect(plan.personUids).toEqual(['A']);
    expect(plan.reports.map((r) => r.report_id)).toEqual(['r1']);
  });

  it('sin identificadores no hace nada', () => {
    const plan = planPurge(
      [buildPerson('A', { value: true, updatedAt: BORRADO })],
      [buildReport('r1', 'A', '2026/01')],
      [],
      AHORA
    );

    expect(plan.personUids).toHaveLength(0);
    expect(plan.reports).toHaveLength(0);
  });
});

describe('purgedOnRestore', () => {
  const HOY = new Date('2026-08-09T00:00:00Z');

  it('avisa de los informes que la norma de conservación se llevaría al volver', () => {
    // Publicador BAUTIZADO INACTIVO (historial cerrado): la norma solo le
    // conserva el año de servicio de sus últimos informes. Mientras está en la
    // papelera nadie los toca —retention se salta a los borrados—, así que el
    // aviso solo puede darse aquí, antes de restaurar.
    const inactivo = buildPerson(
      'A',
      { value: true, updatedAt: BORRADO },
      {
        publisher_baptized: {
          active: { value: false, updatedAt: BORRADO },
          history: [
            {
              id: 'h1',
              _deleted: false,
              updatedAt: BORRADO,
              start_date: '2020-09-01',
              end_date: '2025-06-30',
            },
          ],
        },
      } as unknown as Partial<PersonType['person_data']>
    );

    const enPeligro = purgedOnRestore(
      inactivo,
      [
        buildReport('viejo', 'A', '2023/01'),
        buildReport('ultimo', 'A', '2025/05'),
      ],
      HOY
    );

    expect(enPeligro).toEqual({ reports: 1, enrollments: 0 });
  });

  it('cuenta también los nombramientos cerrados que se llevaría', () => {
    // La misma norma retira los precursorados CERRADOS fuera de la ventana de
    // conservación de la persona. Son parte de su registro, y dejarlos fuera
    // del aviso sería prometer más de lo que se devuelve.
    //
    // Las fechas van con BARRAS porque es como las escribe la app
    // (`useEnrollments`: formatDate(value, 'yyyy/MM/dd')) y como las compara
    // la norma. Con guiones el cotejo del mismo año se decide por el código
    // del separador, no por el mes.
    const inactivo = buildPerson(
      'A',
      { value: true, updatedAt: BORRADO },
      {
        publisher_baptized: {
          active: { value: false, updatedAt: BORRADO },
          history: [
            {
              id: 'h1',
              _deleted: false,
              updatedAt: BORRADO,
              start_date: '2020/09/01',
              end_date: '2025/06/30',
            },
          ],
        },
        enrollments: [
          // cerrado y fuera del año conservado (2024/09–2025/08)
          {
            id: 'e-viejo',
            _deleted: false,
            updatedAt: BORRADO,
            enrollment: 'AP',
            start_date: '2022/09/01',
            end_date: '2022/10/31',
          },
          // cerrado DENTRO del año conservado: no se toca
          {
            id: 'e-dentro',
            _deleted: false,
            updatedAt: BORRADO,
            enrollment: 'AP',
            start_date: '2025/03/01',
            end_date: '2025/03/31',
          },
          // abierto: no se toca nunca
          {
            id: 'e-abierto',
            _deleted: false,
            updatedAt: BORRADO,
            enrollment: 'FR',
            start_date: '2024/09/01',
            end_date: null,
          },
        ],
      } as unknown as Partial<PersonType['person_data']>
    );

    const enPeligro = purgedOnRestore(
      inactivo,
      [buildReport('ultimo', 'A', '2025/05')],
      HOY
    );

    expect(enPeligro).toEqual({ reports: 0, enrollments: 1 });
  });

  it('un publicador activo con informes recientes no pierde nada', () => {
    const activo = buildPerson(
      'A',
      { value: true, updatedAt: BORRADO },
      {
        publisher_baptized: {
          active: { value: true, updatedAt: BORRADO },
          history: [
            {
              id: 'h1',
              _deleted: false,
              updatedAt: BORRADO,
              start_date: '2020-09-01',
              end_date: null,
            },
          ],
        },
      } as unknown as Partial<PersonType['person_data']>
    );

    const enPeligro = purgedOnRestore(
      activo,
      [buildReport('r1', 'A', '2026/05')],
      HOY
    );

    expect(enPeligro).toEqual({ reports: 0, enrollments: 0 });
  });

  it('sin informes no hay nada que avisar', () => {
    const persona = buildPerson('A', { value: true, updatedAt: BORRADO });

    expect(purgedOnRestore(persona, [], HOY)).toEqual({
      reports: 0,
      enrollments: 0,
    });
  });
});
