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
  it('traduce el nombre con el que viaja cada tabla al de su marca', () => {
    // `sched` viaja así pero su marca se llama `schedules`. Sin traducirlo, esa
    // tabla no se limpiaría nunca y subiría en cada ciclo.
    expect(payloadMetadataKeys({ sched: [] })).toEqual(['schedules']);
  });

  it('deja fuera lo que no es una tabla sincronizada', () => {
    const keys = payloadMetadataKeys({
      persons: [],
      affected_uids: [],
      app_settings: {},
      speakers_key: '',
    });

    expect(keys).toEqual(['persons']);
  });

  it('un envío vacío no da por enviada ninguna tabla', () => {
    expect(payloadMetadataKeys({})).toEqual([]);
  });
});

describe('nextExportState — lo que no viaja con su nombre igual se limpia', () => {
  it('una clave que nunca es clave de envío NO se queda pendiente', () => {
    // EL FALLO DEL 2026-08-07: 13 claves de metadata no aparecen nunca con su
    // nombre en un envío —los ajustes viajan dentro de `app_settings`, los
    // programas como `sched`, y las de territorios van por Firestore—. Si se
    // filtrara por «¿viajó?», se quedaban marcadas PARA SIEMPRE y la app decía
    // «cambios pendientes de enviar» eternamente, con el aro amarillo puesto.
    const result = nextExportState({
      current: meta({ user_settings: true, cong_settings: true, territories: true }),
      uploaded: ['persons'],
    });

    expect(result.user_settings.send_local).toBe(false);
    expect(result.cong_settings.send_local).toBe(false);
    expect(result.territories.send_local).toBe(false);
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
  it('solo se mira el cambio de las tablas que SÍ iban en el envío', () => {
    // De una tabla que no viajó no hay nada que esperar, así que su huella no
    // decide nada: se limpia igual.
    const result = nextExportState({
      current: meta({ persons: true }),
      uploaded: ['sched'],
      snapshot: { persons: 'a' },
      actual: { persons: 'b' },
    });

    expect(result.persons.send_local).toBe(false);
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
