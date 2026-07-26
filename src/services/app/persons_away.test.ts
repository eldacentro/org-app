import { describe, expect, it, vi } from 'vitest';
import { PersonType } from '@definition/person';

// El aviso sale traducido; en las pruebas basta con devolver algo reconocible
// para poder distinguir "hay aviso" de "no hay aviso" y de qué tipo es.
vi.mock('@services/i18n/translation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTranslation: ({ key, params }: { key: string; params?: object }) =>
    `${key}:${JSON.stringify(params ?? {})}`,
}));

const { personIsAway } = await import('./persons');

/**
 * Aviso de "esta persona está de ausencia".
 *
 * Sale al asignar a alguien a una reunión, a un turno de exhibidores o a una
 * salida de predicación — y cada uno de esos sitios pasa la fecha en un
 * formato distinto. Comparar '2026-09-27' con '2026/09/24' como si fueran
 * texto da un resultado absurdo, así que el aviso salía (o no salía) sin
 * lógica aparente.
 */

const buildPerson = (
  timeAway: { start_date: string; end_date: string | null; _deleted?: boolean }[]
): PersonType =>
  ({
    person_uid: 'p1',
    person_data: {
      timeAway: timeAway.map((t, i) => ({
        id: `t${i}`,
        _deleted: t._deleted ?? false,
        updatedAt: '2026-01-01T00:00:00Z',
        comments: '',
        ...t,
      })),
    },
  }) as unknown as PersonType;

describe('dentro y fuera del periodo', () => {
  const persona = buildPerson([
    { start_date: '2026/07/20', end_date: '2026/07/31' },
  ]);

  it('avisa un día de dentro del periodo', () => {
    expect(personIsAway(persona, '2026/07/25')).toBeTruthy();
  });

  it('avisa el primer y el último día (los extremos cuentan)', () => {
    expect(personIsAway(persona, '2026/07/20')).toBeTruthy();
    expect(personIsAway(persona, '2026/07/31')).toBeTruthy();
  });

  it('NO avisa el día antes ni el día después', () => {
    expect(personIsAway(persona, '2026/07/19')).toBeUndefined();
    expect(personIsAway(persona, '2026/08/01')).toBeUndefined();
  });

  it('NO avisa en un mes posterior', () => {
    expect(personIsAway(persona, '2026/09/27')).toBeUndefined();
  });
});

describe('ausencia sin fecha de vuelta', () => {
  // Es el caso que hizo saltar todo esto: alguien apunta que se va y no pone
  // fecha de regreso. Sigue ausente — pero el aviso tiene que DECIR que es
  // abierta, o parece un error de la app.
  const persona = buildPerson([{ start_date: '2026/07/24', end_date: null }]);

  it('sigue avisando meses después', () => {
    expect(personIsAway(persona, '2026/09/27')).toBeTruthy();
  });

  it('el aviso deja claro que no hay fecha de vuelta', () => {
    expect(personIsAway(persona, '2026/09/27')).toContain(
      'tr_personAwayOpenNotice'
    );
  });

  it('no avisa ANTES de que empiece', () => {
    expect(personIsAway(persona, '2026/07/23')).toBeUndefined();
  });
});

describe('da igual cómo venga escrita la fecha', () => {
  const persona = buildPerson([
    { start_date: '2026/07/20', end_date: '2026/07/31' },
  ]);

  it('con guiones', () => {
    expect(personIsAway(persona, '2026-07-25')).toBeTruthy();
    expect(personIsAway(persona, '2026-09-27')).toBeUndefined();
  });

  it('como fecha completa ISO', () => {
    expect(personIsAway(persona, '2026-07-25T10:00:00.000Z')).toBeTruthy();
  });

  it('como objeto Date', () => {
    expect(personIsAway(persona, new Date(2026, 6, 25))).toBeTruthy();
    expect(personIsAway(persona, new Date(2026, 8, 27))).toBeUndefined();
  });

  it('y si la ausencia está guardada con guiones, también', () => {
    const otra = buildPerson([
      { start_date: '2026-07-20', end_date: '2026-07-31' },
    ]);

    expect(personIsAway(otra, '2026/07/25')).toBeTruthy();
    expect(personIsAway(otra, '2026/09/27')).toBeUndefined();
  });
});

describe('casos límite', () => {
  it('una ausencia borrada no avisa', () => {
    const persona = buildPerson([
      { start_date: '2026/07/20', end_date: '2026/07/31', _deleted: true },
    ]);

    expect(personIsAway(persona, '2026/07/25')).toBeUndefined();
  });

  it('sin periodos de ausencia, no avisa', () => {
    expect(personIsAway(buildPerson([]), '2026/07/25')).toBeUndefined();
  });

  it('con varios periodos, avisa del que corresponde', () => {
    const persona = buildPerson([
      { start_date: '2026/07/20', end_date: '2026/07/31' },
      { start_date: '2026/09/01', end_date: '2026/09/30' },
    ]);

    expect(personIsAway(persona, '2026/08/15')).toBeUndefined();
    expect(personIsAway(persona, '2026/09/15')).toBeTruthy();
  });

  it('una fecha ilegible no provoca un aviso falso', () => {
    const persona = buildPerson([
      { start_date: '2026/07/20', end_date: '2026/07/31' },
    ]);

    expect(personIsAway(persona, 'no es una fecha')).toBeUndefined();
  });
});
