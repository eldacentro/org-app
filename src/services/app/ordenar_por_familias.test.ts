import { describe, expect, it } from 'vitest';
import type { PersonType } from '@definition/person';
import { ordenarPorFamilias } from './ordenar_por_familias';

/**
 * Orden por familias del PDF de Contactos de emergencia.
 *
 * Lo que de verdad no puede fallar es lo último: que nadie desaparezca del PDF
 * ni salga dos veces. Un contacto de emergencia que falta es peor que uno mal
 * ordenado.
 */

const p = (uid: string, suyos: string[] = []) =>
  ({
    person_uid: uid,
    person_data: {
      family_members: { head: suyos.length > 0, members: suyos, updatedAt: '' },
    },
  }) as unknown as PersonType;

const uids = (lista: PersonType[]) => lista.map((x) => x.person_uid);

describe('la familia sale junta', () => {
  it('con el cabeza delante, donde aparecía el primero de la familia', () => {
    const padre = p('padre', ['madre', 'hijo']);
    const madre = p('madre');
    const hijo = p('hijo');
    const ana = p('ana');
    const luis = p('luis');

    const hoja = [ana, hijo, luis, padre, madre];

    expect(uids(ordenarPorFamilias(hoja, hoja))).toEqual([
      'ana',
      'padre',
      'madre',
      'hijo',
      'luis',
    ]);
  });

  it('quien se añadió al final por no tener grupo propio sube junto a los suyos', () => {
    const padre = p('padre', ['hijo']);
    const hijo = p('hijo');
    const hoja = [padre, p('ana'), p('luis'), hijo];

    expect(uids(ordenarPorFamilias(hoja, hoja))).toEqual([
      'padre',
      'hijo',
      'ana',
      'luis',
    ]);
  });

  it('una familia dentro de otra sigue a su cabeza, con los suyos detrás', () => {
    const abuelo = p('abuelo', ['padre']);
    const padre = p('padre', ['nieto']);
    const nieto = p('nieto');
    const hoja = [nieto, abuelo, p('x'), padre];

    expect(uids(ordenarPorFamilias(hoja, hoja))).toEqual([
      'abuelo',
      'padre',
      'nieto',
      'x',
    ]);
  });
});

describe('lo que NO cambia', () => {
  it('sin familias, el orden es exactamente el de siempre', () => {
    const hoja = [p('c'), p('a'), p('b')];

    expect(uids(ordenarPorFamilias(hoja, hoja))).toEqual(['c', 'a', 'b']);
  });

  it('si el cabeza está en otro grupo, los de esta hoja salen juntos y nadie cambia de hoja', () => {
    const padre = p('padre', ['h1', 'h2']);
    const h1 = p('h1');
    const h2 = p('h2');
    const todas = [padre, h1, h2, p('ana')];

    const hoja = [h1, todas[3], h2];

    expect(uids(ordenarPorFamilias(hoja, todas))).toEqual(['h1', 'h2', 'ana']);
  });

  it('no muta la lista que recibe', () => {
    const hoja = [p('ana'), p('hijo'), p('padre', ['hijo'])];
    const antes = uids(hoja);

    ordenarPorFamilias(hoja, hoja);

    expect(uids(hoja)).toEqual(antes);
  });
});

describe('con datos raros nadie se pierde ni sale dos veces', () => {
  it('ciclos, gente en dos familias y una familia que se apunta a sí misma', () => {
    const todas = [
      p('A', ['B']),
      p('B', ['A']),
      p('C', ['x']),
      p('D', ['x']),
      p('E', ['E', 'y', 'fantasma']),
      p('x'),
      p('y'),
      p('z'),
    ];

    const hoja = [todas[5], todas[0], todas[6], todas[1], todas[4], todas[7]];

    const resultado = uids(ordenarPorFamilias(hoja, todas));

    expect(resultado).toHaveLength(hoja.length);
    expect(new Set(resultado).size).toBe(hoja.length);
    expect([...resultado].sort()).toEqual(uids(hoja).sort());
  });

  it('sin datos de familia en la persona, no revienta', () => {
    const rara = { person_uid: 'r', person_data: {} } as unknown as PersonType;

    expect(uids(ordenarPorFamilias([rara, p('a')], [rara]))).toEqual([
      'r',
      'a',
    ]);
  });
});
