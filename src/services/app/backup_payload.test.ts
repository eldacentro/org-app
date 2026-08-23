import { describe, expect, it } from 'vitest';
import {
  copiaTraeRegistro,
  copiaTraeTabla,
  TABLAS_LISTA,
  tablasQueTraeLaCopia,
} from './backup_payload';

/**
 * Qué se toca al restaurar y qué no.
 *
 * Esto existe por un fallo concreto: restaurar empezaba VACIANDO las tablas y
 * las rellenaba después, así que un archivo al que le faltara una la dejaba
 * vacía. Y no se nota al momento — se nota semanas después, cuando alguien abre
 * ese módulo.
 */

describe('una tabla que la copia NO trae no se toca', () => {
  it('la clave que no está, no se toca', () => {
    expect(copiaTraeTabla({}, 'persons')).toBe(false);
    expect(copiaTraeTabla(undefined, 'persons')).toBe(false);
    expect(copiaTraeTabla(null, 'persons')).toBe(false);
  });

  it('lo que no es una lista tampoco cuenta', () => {
    // Un archivo a medio escribir, o de otra aplicación. Vaciar la tabla por
    // esto sería lo peor que puede hacer una restauración.
    expect(copiaTraeTabla({ persons: null }, 'persons')).toBe(false);
    expect(copiaTraeTabla({ persons: 'todas' }, 'persons')).toBe(false);
    expect(copiaTraeTabla({ persons: {} }, 'persons')).toBe(false);
  });

  it('traerla VACÍA sí cuenta: es un dato', () => {
    // Una congregación puede no tener ningún exhibidor, y esa copia dice
    // exactamente eso.
    expect(copiaTraeTabla({ exhibitors: [] }, 'exhibitors')).toBe(true);
  });
});

describe('la lista de lo que hay que rehacer', () => {
  it('solo lo que viene', () => {
    const trae = tablasQueTraeLaCopia({
      persons: [{ id: 1 }],
      sched: [],
      cosa_rara: [1, 2],
    });

    expect(trae).toEqual(['persons', 'sched']);
  });

  it('una copia vieja, sin los módulos nuevos, no se lleva nada por delante', () => {
    // Exactamente el caso que rompía: un archivo de antes de que existieran
    // Exhibidores o Territorios.
    const trae = tablasQueTraeLaCopia({ persons: [], sched: [], sources: [] });

    expect(trae).not.toContain('exhibitors');
    expect(trae).not.toContain('service_outings');
    expect(trae).not.toContain('departments_schedule');
  });

  it('una copia sin nada reconocible no toca NADA', () => {
    expect(tablasQueTraeLaCopia({})).toEqual([]);
    expect(tablasQueTraeLaCopia(null)).toEqual([]);
  });

  it('lo que vive en Firestore NO está aquí, y es a propósito', () => {
    // Territorios y las correcciones de discursos del circuito viajan en la
    // copia, pero no se restauran vaciando una tabla local: los repone su
    // propio servicio contra Firestore. Meterlos en esta lista haría que
    // `restoreFromPayload` buscara una tabla que no existe.
    expect(TABLAS_LISTA).not.toContain('territories');
    expect(TABLAS_LISTA).not.toContain('speaker_overrides');
  });

  it('están todos los módulos que la aplicación guarda hoy', () => {
    // Si mañana se añade un módulo y no se mete aquí, su tabla no se
    // restaurará nunca y no lo dirá nadie. Esta cuenta es el recordatorio.
    expect(TABLAS_LISTA).toHaveLength(21);
    expect(TABLAS_LISTA).toContain('exhibitors');
    expect(TABLAS_LISTA).toContain('service_outings');
    expect(TABLAS_LISTA).toContain('departments_schedule');
    expect(TABLAS_LISTA).toContain('responsabilidades');
    expect(TABLAS_LISTA).toContain('circuit_overseer_visits');
    expect(TABLAS_LISTA).toContain('public_talks_override');
    expect(TABLAS_LISTA).toContain('songs_override');
    expect(TABLAS_LISTA).toContain('delegated_field_service_reports');
  });
});

describe('los registros sueltos', () => {
  it('un objeto cuenta', () => {
    expect(
      copiaTraeRegistro({ limpieza_config: { id: 1 } }, 'limpieza_config')
    ).toBe(true);
  });

  it('`null` NO cuenta como motivo para borrar', () => {
    // `null` dentro de una copia significa «esto no estaba configurado», no
    // «bórralo». Para borrar está la pantalla del módulo.
    expect(
      copiaTraeRegistro({ evacuacion_config: null }, 'evacuacion_config')
    ).toBe(false);
    expect(copiaTraeRegistro({}, 'evacuacion_config')).toBe(false);
  });

  it('una lista tampoco: eso es otra cosa', () => {
    expect(copiaTraeRegistro({ limpieza_config: [] }, 'limpieza_config')).toBe(
      false
    );
  });
});
