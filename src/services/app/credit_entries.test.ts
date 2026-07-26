import { describe, expect, it } from 'vitest';
import {
  CreditEntry,
  creditEntriesToHoursValue,
  creditEntriesTotal,
  creditEntryAdd,
  creditEntryRemove,
  hasCreditEntries,
} from './credit_entries';

/**
 * Crédito de horas desglosado por motivo.
 *
 * El total que sale de aquí es el que ve el secretario y el que cuenta para el
 * requisito del precursor, así que sumar mal tiene consecuencias reales.
 */

const entry = (
  id: string,
  hours: number,
  type: CreditEntry['type'] = 'theocratic_assignments'
): CreditEntry => ({ id, type, hours });

describe('sumar el crédito', () => {
  it('suma las horas de todas las entradas', () => {
    expect(creditEntriesTotal([entry('a', 25), entry('b', 30)])).toBe(55);
  });

  it('sin entradas, el total es cero', () => {
    expect(creditEntriesTotal([])).toBe(0);
    expect(creditEntriesTotal(undefined)).toBe(0);
  });

  it('ignora valores imposibles en vez de propagar un NaN al informe', () => {
    const sucio = [
      entry('a', 10),
      { id: 'b', type: 'other', hours: Number.NaN } as CreditEntry,
      { id: 'c', type: 'other', hours: -5 } as CreditEntry,
    ];

    expect(creditEntriesTotal(sucio)).toBe(10);
  });

  it('da el total en el formato de horas del informe', () => {
    expect(creditEntriesToHoursValue([entry('a', 25), entry('b', 30)])).toBe(
      '55:00'
    );
    expect(creditEntriesToHoursValue([])).toBe('0:00');
  });
});

describe('añadir entradas', () => {
  it('añade y conserva las anteriores', () => {
    const result = creditEntryAdd([entry('a', 25)], {
      type: 'pioneer_school',
      hours: 30,
    });

    expect(result).toHaveLength(2);
    expect(creditEntriesTotal(result)).toBe(55);
  });

  it('toda entrada nace con identificador propio', () => {
    // Sin id, el motor de fusión descarta el registro sin decir nada.
    const result = creditEntryAdd([], { type: 'ske', hours: 160 });

    expect(result[0].id).toBeTruthy();
    expect(result[0].id).not.toBe(creditEntryAdd([], { type: 'ske', hours: 160 })[0].id);
  });

  it('no añade una entrada de cero horas', () => {
    expect(creditEntryAdd([], { type: 'other', hours: 0 })).toHaveLength(0);
    expect(creditEntryAdd([], { type: 'other', hours: -3 })).toHaveLength(0);
  });

  it('en "Otro" guarda lo que escribió la persona, sin espacios de más', () => {
    const result = creditEntryAdd([], {
      type: 'other',
      label: '  Asamblea regional  ',
      hours: 8,
    });

    expect(result[0].label).toBe('Asamblea regional');
  });

  it('en los tipos fijos no guarda etiqueta (la pone la traducción)', () => {
    const result = creditEntryAdd([], {
      type: 'pioneer_school',
      label: 'lo que sea',
      hours: 30,
    });

    expect(result[0].label).toBeUndefined();
  });
});

describe('quitar entradas', () => {
  it('quita solo la indicada', () => {
    const result = creditEntryRemove([entry('a', 25), entry('b', 30)], 'a');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
    expect(creditEntriesTotal(result)).toBe(30);
  });

  it('quitar algo que no está no rompe nada', () => {
    expect(creditEntryRemove([entry('a', 25)], 'zzz')).toHaveLength(1);
  });

  it('quitar la última deja la lista vacía y el total a cero', () => {
    const result = creditEntryRemove([entry('a', 25)], 'a');

    expect(result).toHaveLength(0);
    expect(creditEntriesTotal(result)).toBe(0);
  });
});

describe('informes anteriores a esto', () => {
  it('se reconocen como "sin desglose" para no inventarles un motivo', () => {
    expect(hasCreditEntries(undefined)).toBe(false);
    expect(hasCreditEntries([])).toBe(false);
    expect(hasCreditEntries([entry('a', 25)])).toBe(true);
  });
});
