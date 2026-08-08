import { describe, expect, it } from 'vitest';
import { SchedWeekType } from '@definition/schedules';
import {
  buildSpeakerCongregationMap,
  stampSpeakerInfo,
} from './speaker_congregation';

/**
 * La congregación del orador, copiada dentro del programa.
 *
 * Esto escribe en la tabla de programas, que viaja a TODA la congregación. Dos
 * formas de hacer daño aquí, y las dos han ocurrido de verdad:
 *
 * - Sellar un catálogo SIN descifrar mete texto cifrado dentro del programa. Es
 *   la forma del fallo del 2026-08-08, cuando se le mandaron a los publicadores
 *   unas tablas que no pueden leer y les salió un error en pantalla.
 * - Sellar cuando no hace falta reenvía programas enteros en cada ciclo.
 */

const week = (speaker: Record<string, unknown>) =>
  ({
    weekOf: '2026/10/05',
    weekend_meeting: { speaker },
  }) as unknown as SchedWeekType;

const asignacion = (extra: Record<string, unknown> = {}) => [
  { type: 'main', value: 'uid-orador', name: 'Juan', ...extra },
];

describe('qué se sella y qué no', () => {
  const mapa = new Map([['uid-orador', 'Petrer Centro']]);

  it('rellena la congregación que falta', () => {
    const semana = week({ part_1: asignacion(), part_2: [] });

    expect(stampSpeakerInfo(semana, mapa)).toBe(true);
    expect(semana.weekend_meeting.speaker.part_1[0].congregation).toBe(
      'Petrer Centro'
    );
  });

  it('NO pisa una congregación ya escrita', () => {
    // Lo que alguien haya puesto manda sobre lo que deduzca el relleno.
    const semana = week({
      part_1: asignacion({ congregation: 'La que puso el anciano' }),
      part_2: [],
    });

    expect(stampSpeakerInfo(semana, mapa)).toBe(false);
    expect(semana.weekend_meeting.speaker.part_1[0].congregation).toBe(
      'La que puso el anciano'
    );
  });

  it('sin nada que sellar no dice que ha tocado nada', () => {
    // Si dijera que sí, se guardaría la semana y se pediría subir: un POST por
    // ciclo que despierta a toda la congregación para nada.
    const semana = week({ part_1: asignacion({ value: 'otro-uid' }) });

    expect(stampSpeakerInfo(semana, mapa)).toBe(false);
  });

  it('una semana sin orador no revienta', () => {
    expect(stampSpeakerInfo(week({}), mapa)).toBe(false);
    expect(stampSpeakerInfo({} as SchedWeekType, mapa)).toBe(false);
  });

  it('rellena el NOMBRE vacío, que es lo que deja la línea en blanco', () => {
    // En los datos reales la mayoría de los oradores del catálogo se guardaron
    // con `name: ''`. Ese campo es el ÚNICO por el que un publicador puede saber
    // quién da el discurso: el catálogo va cifrado con la llave maestra y él no
    // la tiene.
    const semana = week({ part_1: asignacion({ name: '' }) });
    const nombres = new Map([['uid-orador', 'Antonio Reus']]);

    expect(stampSpeakerInfo(semana, mapa, nombres)).toBe(true);
    expect(semana.weekend_meeting.speaker.part_1[0].name).toBe('Antonio Reus');
  });

  it('NO pisa un nombre ya escrito', () => {
    const semana = week({ part_1: asignacion({ congregation: 'X' }) });
    const nombres = new Map([['uid-orador', 'Otro Nombre']]);

    expect(stampSpeakerInfo(semana, mapa, nombres)).toBe(false);
    expect(semana.weekend_meeting.speaker.part_1[0].name).toBe('Juan');
  });

  it('una asignación vacía se deja en paz', () => {
    const semana = week({ part_1: asignacion({ value: '' }) });

    expect(stampSpeakerInfo(semana, mapa)).toBe(false);
  });
});

describe('de dónde sale el nombre, y qué se descarta', () => {
  const oradores = [
    { person_uid: 'uid-orador', speaker_data: { cong_id: 'cong-1' } },
  ];

  it('casa el orador con su congregación', () => {
    const mapa = buildSpeakerCongregationMap(oradores, [
      { id: 'cong-1', cong_data: { cong_name: { value: 'Petrer Centro' } } },
    ]);

    expect(mapa.get('uid-orador')).toBe('Petrer Centro');
  });

  it('acepta también el nombre como texto suelto', () => {
    const mapa = buildSpeakerCongregationMap(oradores, [
      { id: 'cong-1', cong_data: { cong_name: 'Petrer Centro' } },
    ]);

    expect(mapa.get('uid-orador')).toBe('Petrer Centro');
  });

  it('DESCARTA lo que no es texto: el catálogo sin descifrar', () => {
    // EL FALLO DEL 2026-08-08. Un dispositivo sin la llave maestra recibe este
    // catálogo cifrado, y sus campos llegan como objetos o ausentes. Sellar eso
    // metería basura dentro del programa de toda la congregación.
    const cifrado = buildSpeakerCongregationMap(oradores, [
      { id: 'cong-1', cong_data: { cong_name: { value: undefined } } },
    ]);

    expect(cifrado.size).toBe(0);

    const ausente = buildSpeakerCongregationMap(oradores, [
      { id: 'cong-1', cong_data: {} },
    ]);

    expect(ausente.size).toBe(0);
  });

  it('descarta un nombre en blanco', () => {
    const mapa = buildSpeakerCongregationMap(oradores, [
      { id: 'cong-1', cong_data: { cong_name: { value: '   ' } } },
    ]);

    expect(mapa.size).toBe(0);
  });

  it('un orador sin congregación apuntada no entra', () => {
    const mapa = buildSpeakerCongregationMap(
      [{ person_uid: 'uid-orador', speaker_data: {} }],
      [{ id: 'cong-1', cong_data: { cong_name: { value: 'Petrer' } } }]
    );

    expect(mapa.size).toBe(0);
  });

  it('listas vacías o ausentes no revientan', () => {
    expect(buildSpeakerCongregationMap([], []).size).toBe(0);
    expect(buildSpeakerCongregationMap(undefined!, undefined!).size).toBe(0);
  });
});
