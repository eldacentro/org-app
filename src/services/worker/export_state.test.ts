import { describe, expect, it } from 'vitest';
import { nextExportState, payloadMetadataKeys } from './export_state';
import { MetadataRecordType } from '@definition/metadata';

/**
 * Qué se da por enviado al terminar un ciclo.
 *
 * Equivocarse aquí no rompe nada a la vista: simplemente un cambio se queda en
 * el móvil para siempre y nadie más lo ve. Pasó de verdad el 2026-08-06, así
 * que cada caso está escrito como la frase que describiría el fallo.
 */

const meta = (
  entradas: Record<string, boolean>
): MetadataRecordType['metadata'] =>
  Object.fromEntries(
    Object.entries(entradas).map(([key, send_local]) => [
      key,
      { version: 'v1', send_local },
    ])
  ) as MetadataRecordType['metadata'];

describe('payloadMetadataKeys', () => {
  it('una clave de envío puede llevar DOS marcas dentro', () => {
    expect(payloadMetadataKeys({ app_settings: {} }).sort()).toEqual([
      'cong_settings',
      'user_settings',
    ]);
  });

  it('traduce el nombre con el que viaja cada tabla al de su marca', () => {
    // `sched` viaja así pero su marca se llama `schedules`. Sin traducirlo, esa
    // tabla no se limpiaría nunca y subiría en cada ciclo.
    expect(payloadMetadataKeys({ sched: [] })).toEqual(['schedules']);
  });

  it('deja fuera lo que no es una tabla sincronizada', () => {
    const keys = payloadMetadataKeys({
      persons: [],
      affected_uids: [],
      speakers_key: '',
    });

    expect(keys).toEqual(['persons']);
  });

  it('un envío vacío no da por enviada ninguna tabla', () => {
    expect(payloadMetadataKeys({})).toEqual([]);
  });
});

describe('nextExportState — lo que no viaja con su nombre igual se limpia', () => {
  it('un ciclo que no sube nada NO da por enviado nada', () => {
    // EL FALLO: si lo único marcado es una tabla que este rol no puede subir, el
    // envío sale vacío. Dar por enviadas todas las marcas ahí dejaba ese cambio
    // en el móvil para siempre. Pasa de verdad: el limpiador de duplicados de
    // oradores marca esas tablas en TODOS los dispositivos, pero solo las sube
    // quien lleva los discursos públicos.
    const result = nextExportState({
      current: meta({ visiting_speakers: true, persons: true }),
      uploaded: [],
    });

    expect(result.visiting_speakers.send_local).toBe(true);
    expect(result.persons.send_local).toBe(true);
  });

  it('los ajustes se limpian cuando viaja `app_settings`', () => {
    // Viajan los dos juntos bajo una sola clave de envío, pero se marcan por
    // separado. Sin traducir esa clave a las DOS marcas, se quedaban puestas.
    const result = nextExportState({
      current: meta({ user_settings: true, cong_settings: true }),
      uploaded: payloadMetadataKeys({ app_settings: {} }),
    });

    expect(result.user_settings.send_local).toBe(false);
    expect(result.cong_settings.send_local).toBe(false);
  });

  it('lo que solo se recibe se limpia aunque no viaje nunca', () => {
    // EL FALLO DEL 2026-08-07: 13 claves de metadata no aparecen nunca con su
    // nombre en un envío —los ajustes viajan dentro de `app_settings`, los
    // programas como `sched`, y las de territorios van por Firestore—. Si se
    // filtrara por «¿viajó?», se quedaban marcadas PARA SIEMPRE y la app decía
    // «cambios pendientes de enviar» eternamente, con el aro amarillo puesto.
    // `public_sources` y `public_schedules` las genera el servidor: el móvil las
    // baja y no las sube jamás, pero nacen marcadas. Exigirles que hubieran
    // viajado las dejaba puestas para siempre — el aro amarillo eterno.
    const result = nextExportState({
      current: meta({ public_sources: true, public_schedules: true }),
      uploaded: ['persons'],
    });

    expect(result.public_sources.send_local).toBe(false);
    expect(result.public_schedules.send_local).toBe(false);
  });

  it('una tabla VACÍA se limpia aunque no viaje — el aro amarillo eterno', () => {
    // EL FALLO: las ocho tablas de territorios nacen marcadas, pero solo viajan
    // si tienen registros (`item.data.length > 0`) Y solo para ancianos y
    // administradores. A una publicadora no le viajan JAMÁS, y a un anciano se
    // le quedan colgadas todas las que tenga vacías —avisos, campañas,
    // peticiones—. Exigirles que hubieran viajado las dejaba marcadas para
    // siempre: «cambios pendientes de enviar» y el aro amarillo, para siempre,
    // en todos los dispositivos.
    //
    // Y limpiarlas no pierde nada: una tabla vacía en un envío no borra nada en
    // el servidor, o sea que enviarla no haría absolutamente nada.
    const result = nextExportState({
      current: meta({ territory_notices: true, territories: true }),
      uploaded: ['territories'],
      vacias: ['territory_notices'],
    });

    expect(result.territory_notices.send_local).toBe(false);
    expect(result.territories.send_local).toBe(false);
  });

  it('pero una tabla CON contenido que no viajó sigue pendiente', () => {
    // El otro lado de la moneda, y es el que pierde datos: si tiene registros,
    // hay algo que enviar. Limpiarla dejaría ese cambio en el móvil para
    // siempre.
    const result = nextExportState({
      current: meta({ visiting_speakers: true }),
      uploaded: ['persons'],
      vacias: ['territory_notices'],
    });

    expect(result.visiting_speakers.send_local).toBe(true);
  });

  it('sin lista de enviadas se limpia todo, como siempre', () => {
    const result = nextExportState({ current: meta({ persons: true }) });

    expect(result.persons.send_local).toBe(false);
  });

  it('no toca las tablas que ya estaban limpias', () => {
    const result = nextExportState({
      current: meta({ persons: false }),
      uploaded: ['persons'],
    });

    expect(result.persons.send_local).toBe(false);
  });
});

describe('nextExportState — lo editado MIENTRAS se subía', () => {
  it('una tabla que no viajó sigue pendiente, cambiara o no', () => {
    const result = nextExportState({
      current: meta({ persons: true }),
      uploaded: ['sched'],
      snapshot: { persons: 'a' },
      actual: { persons: 'b' },
    });

    expect(result.persons.send_local).toBe(true);
  });

  it('si la tabla cambió por el camino, la marca se queda puesta', () => {
    // EL CASO DEL 2026-08-06: alguien apunta un crédito mientras su móvil está
    // subiendo. El cambio no iba en ese envío, pero se daba por enviado.
    const result = nextExportState({
      current: meta({ cong_field_service_reports: true }),
      uploaded: ['cong_field_service_reports'],
      snapshot: { cong_field_service_reports: 'a' },
      actual: { cong_field_service_reports: 'b' },
    });

    expect(result.cong_field_service_reports.send_local).toBe(true);
  });

  it('si no cambió, se da por enviada', () => {
    const result = nextExportState({
      current: meta({ cong_field_service_reports: true }),
      uploaded: ['cong_field_service_reports'],
      snapshot: { cong_field_service_reports: 'a' },
      actual: { cong_field_service_reports: 'a' },
    });

    expect(result.cong_field_service_reports.send_local).toBe(false);
  });

  it('el cambio de una tabla no deja pendientes a las demás', () => {
    const result = nextExportState({
      current: meta({ persons: true, sched: true }),
      uploaded: ['persons', 'sched'],
      snapshot: { persons: 'a', sched: 'x' },
      actual: { persons: 'b', sched: 'x' },
    });

    expect(result.persons.send_local).toBe(true);
    expect(result.sched.send_local).toBe(false);
  });

  it('sin huella de esa tabla no se concluye que cambió', () => {
    // Una tabla que no aparece en la huella no se sabe si cambió, y en la duda
    // se hace lo de siempre: si viajó, se limpia.
    const result = nextExportState({
      current: meta({ persons: true }),
      uploaded: ['persons'],
      snapshot: {},
      actual: {},
    });

    expect(result.persons.send_local).toBe(false);
  });
});

describe('nextExportState — lo que no se puede perder', () => {
  it('conserva el resto de campos de cada entrada', () => {
    // La entrada lleva la versión del servidor; perderla obligaría a
    // re-descargar la tabla entera en el ciclo siguiente.
    const current = {
      persons: { version: '2026-08-06T10:00:00Z', send_local: true },
    } as MetadataRecordType['metadata'];

    const result = nextExportState({ current, uploaded: ['persons'] });

    expect(result.persons.version).toBe('2026-08-06T10:00:00Z');
  });

  it('no se inventa tablas que no estaban', () => {
    const result = nextExportState({
      current: meta({ persons: true }),
      uploaded: ['persons', 'sched'],
    });

    expect(Object.keys(result)).toEqual(['persons']);
  });
});
