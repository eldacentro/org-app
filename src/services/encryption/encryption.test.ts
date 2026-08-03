import { describe, expect, it } from 'vitest';
import {
  decryptData,
  decryptObject,
  encryptData,
  encryptObject,
  generateKey,
} from './index';
import {
  TABLE_DECRYPTION_MAP,
  TABLE_ENCRYPTION_MAP,
} from '@constants/table_encryption_map';

/**
 * El cifrado de extremo a extremo.
 *
 * Si esto se rompe, no se pierde un dato: se vuelven ilegibles TODOS los de la
 * congregación, y encima sin avisar (lo que sube ya va cifrado con la clave
 * mala). Por eso lo primero que se comprueba es lo más tonto: que lo que se
 * cifra se vuelve a leer igual.
 */

const ACCESS_CODE = 'clave-de-acceso-de-prueba';
const MASTER_KEY = 'llave-maestra-de-prueba';

describe('cifrado y descifrado de un valor', () => {
  it('lo que se cifra se recupera idéntico', () => {
    const original = 'Hermano de prueba';
    const cipher = encryptData(original, ACCESS_CODE);

    expect(cipher).not.toBe(original);
    expect(decryptData(cipher, ACCESS_CODE, 'campo')).toBe(original);
  });

  it('con la clave equivocada NO devuelve basura: falla', () => {
    // Importante que lance en vez de devolver algo: un fallo silencioso aquí
    // acabaría guardando texto ilegible como si fuera el dato bueno.
    const cipher = encryptData('Hermano de prueba', ACCESS_CODE);

    expect(() => decryptData(cipher, 'otra-clave', 'campo')).toThrow();
  });

  it('el mismo texto cifrado dos veces no da el mismo resultado', () => {
    // (sal aleatoria) — si diera lo mismo, se podrían deducir repeticiones
    const a = encryptData('mismo texto', ACCESS_CODE);
    const b = encryptData('mismo texto', ACCESS_CODE);

    expect(a).not.toBe(b);
    expect(decryptData(a, ACCESS_CODE, 'campo')).toBe(
      decryptData(b, ACCESS_CODE, 'campo')
    );
  });

  it('aguanta acentos, eñes y emojis', () => {
    const original = 'Núñez, Mª Ángeles — predicación 📖';

    expect(
      decryptData(encryptData(original, ACCESS_CODE), ACCESS_CODE, 'campo')
    ).toBe(original);
  });

  it('generateKey da claves de 64 caracteres y siempre distintas', () => {
    const a = generateKey();
    const b = generateKey();

    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });
});

describe('cifrado de una ficha de persona entera', () => {
  const buildPerson = () => ({
    person_uid: 'uid-1',
    person_data: {
      person_firstname: { value: 'Carlos', updatedAt: '2026-01-01T00:00:00Z' },
      person_lastname: { value: 'Saca', updatedAt: '2026-01-01T00:00:00Z' },
      birth_date: { value: '2002-04-15', updatedAt: '2026-01-01T00:00:00Z' },
      _deleted: { value: false, updatedAt: '2026-01-01T00:00:00Z' },
    },
  });

  it('ida y vuelta: la ficha vuelve exactamente igual', () => {
    const original = buildPerson();
    const data = buildPerson();

    encryptObject({
      data,
      table: 'persons',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });
    decryptObject({
      data,
      table: 'persons',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(data).toEqual(original);
  });

  it('el nombre viaja cifrado (no en claro)', () => {
    const data = buildPerson();

    encryptObject({
      data,
      table: 'persons',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(JSON.stringify(data)).not.toContain('Carlos');
    expect(JSON.stringify(data)).not.toContain('Saca');
  });

  it('la fecha de nacimiento va con la LLAVE MAESTRA, no con el código de acceso', () => {
    // Es el reparto que sostiene toda la privacidad: quien solo tiene el
    // código de acceso NO puede leer los datos sensibles.
    const data = buildPerson();

    encryptObject({
      data,
      table: 'persons',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    const birth = data.person_data.birth_date as unknown as string;

    expect(() => decryptData(birth, ACCESS_CODE, 'birth')).toThrow();
    expect(JSON.parse(decryptData(birth, MASTER_KEY, 'birth')).value).toBe(
      '2002-04-15'
    );
  });

  it('se cifra el campo ENTERO, marca de tiempo incluida', () => {
    // O sea que el servidor no ve ni el valor ni cuándo se cambió. La fusión
    // por fechas sigue funcionando porque siempre se descifra ANTES de
    // fusionar — nunca se comparan marcas cifradas.
    const data = buildPerson();

    encryptObject({
      data,
      table: 'persons',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(typeof data.person_data.person_firstname).toBe('string');
    expect(JSON.stringify(data)).not.toContain('2026-01-01T00:00:00Z');
  });

  it('el identificador de la persona viaja en claro (es la clave para casarlas)', () => {
    const data = buildPerson();

    encryptObject({
      data,
      table: 'persons',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(data.person_uid).toBe('uid-1');
  });
});

describe('informe de predicación', () => {
  const buildReport = () => ({
    report_id: 'r-1',
    report_data: {
      _deleted: false,
      updatedAt: '2026-01-01T00:00:00Z',
      report_date: '2026/01',
      person_uid: 'uid-1',
      shared_ministry: true,
      hours: { field_service: 12, credit: { value: 25, approved: 25 } },
      bible_studies: 2,
      comments: '25 Hrs. LDC',
      late: { value: false, submitted: '' },
      status: 'confirmed',
    },
  });

  it('ida y vuelta sin perder ni cambiar nada', () => {
    const original = buildReport();
    const data = buildReport();

    encryptObject({
      data,
      table: 'cong_field_service_reports',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });
    decryptObject({
      data,
      table: 'cong_field_service_reports',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(data).toEqual(original);
  });

  it('las horas y el crédito no viajan en claro', () => {
    const data = buildReport();

    encryptObject({
      data,
      table: 'cong_field_service_reports',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(JSON.stringify(data)).not.toContain('25 Hrs. LDC');
  });
});

/**
 * El cancionero importado a mano viaja como una tabla más desde que se
 * sincroniza. Si el mapa de cifrado se dejara un campo fuera, ese campo saldría
 * EN CLARO al servidor sin que nada fallara; y si nombrara uno que no existe,
 * la vuelta traería el título cifrado y los cánticos saldrían ilegibles en el
 * resto de dispositivos. Las dos cosas se ven aquí y en ningún otro sitio.
 */
describe('songs_override — el cancionero importado', () => {
  const buildOverride = () => ({
    id: '1',
    updatedAt: '2026-08-03T00:00:00Z',
    overrides: { S: { '163': '163. Ya puedo ver' } },
    publicationTitle: 'Cantemos con gozo',
    symbol: 'sjj',
    total: 163,
  });

  it('ida y vuelta: vuelve exactamente igual', () => {
    const original = buildOverride();
    const data = buildOverride();

    encryptObject({
      data,
      table: 'songs_override',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });
    decryptObject({
      data,
      table: 'songs_override',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(data).toEqual(original);
  });

  it('los títulos no viajan en claro', () => {
    const data = buildOverride();

    encryptObject({
      data,
      table: 'songs_override',
      accessCode: ACCESS_CODE,
      masterKey: MASTER_KEY,
    });

    expect(JSON.stringify(data)).not.toContain('Ya puedo ver');
    expect(JSON.stringify(data)).not.toContain('Cantemos con gozo');
  });
});

/**
 * Salidas de predicación — el despliegue por fases.
 *
 * Cinco campos de Salidas viajaban en claro: `monthlyOverrides`,
 * `disabledSlots` y `sharedSlots` en los ajustes (este último con los NOMBRES
 * de las congregaciones vecinas), y `isCircuitOverseerWeek` y
 * `weekOverrideHours` en las semanas. Comprobado en el bucket real.
 *
 * Empezar a cifrarlos de golpe rompe a quien no se haya actualizado: se baja
 * una cadena donde espera una lista, `[...disabledSlots]` la desparrama en
 * letras sueltas y ESO se sube a toda la congregación. Así que va en dos
 * fases, y esto fija que la fase 1 es la inofensiva:
 *
 *   fase 1 (ahora)  se saben DESCIFRAR, se siguen subiendo en claro
 *   fase 2 (luego)  se mueven a TABLE_ENCRYPTION_MAP y empiezan a subir cifrados
 *
 * Si alguien adelanta la fase 2 sin querer, el primer test de aquí abajo se
 * pone rojo y lo cuenta.
 */
describe('service_outings — despliegue por fases de los campos en claro', () => {
  const PENDIENTES = [
    'monthlyOverrides',
    'disabledSlots',
    'sharedSlots',
    'isCircuitOverseerWeek',
    'weekOverrideHours',
  ];

  const buildAjustes = () => ({
    weekOf: 'settings',
    updatedAt: '2026-08-03T00:00:00Z',
    defaultHours: { saturday_morning: '09:45' },
    locations: ['Salón del Reino'],
    availability: {},
    monthlyOverrides: {
      '2026/07': { saturday_morning: '09:00' },
      '2026/08': { isCancelledMonth: true, keepActiveSlots: ['saturday'] },
    },
    disabledSlots: ['monday_morning', 'friday_morning'],
    sharedSlots: [
      { id: 'a1', slotKey: 'sunday_morning', congregation: 'Elda Oeste' },
    ],
  });

  const buildSemana = () => ({
    weekOf: '2026/10/12',
    updatedAt: '2026-08-03T00:00:00Z',
    outings: [],
    isCircuitOverseerWeek: true,
    weekOverrideHours: { wednesday_morning: '10:30' },
  });

  it('FASE 1: los cinco se saben descifrar pero NO se cifran todavía', () => {
    for (const campo of PENDIENTES) {
      expect(
        TABLE_ENCRYPTION_MAP.service_outings,
        `${campo} ya se está cifrando: eso es la fase 2, y antes hay que ` +
          'comprobar que no queda ningún dispositivo sin actualizar ' +
          '(scripts/pending_encryption_check.mjs)'
      ).not.toHaveProperty(campo);

      expect(TABLE_DECRYPTION_MAP.service_outings).toHaveProperty(campo);
    }
  });

  it('FASE 1: subir no cambia nada en el cable, así no rompe a nadie', () => {
    for (const original of [buildAjustes(), buildSemana()]) {
      const data = structuredClone(original);
      encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

      for (const campo of PENDIENTES) {
        if (campo in original) expect(data[campo]).toEqual(original[campo]);
      }
    }
  });

  it('FASE 1: lo demás de la tabla se sigue cifrando como siempre', () => {
    const data = buildAjustes();
    encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    expect(typeof data.defaultHours).toBe('string');
    expect(typeof data.locations).toBe('string');
    expect(JSON.stringify(data)).not.toContain('Salón del Reino');
  });

  it('lo que YA está en claro se deja intacto al bajar (no hay migración)', () => {
    for (const original of [buildAjustes(), buildSemana()]) {
      const data = structuredClone(original);
      decryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });
      expect(data).toEqual(original);
    }
  });

  it('LISTO PARA LA FASE 2: si llegan cifrados, este build ya sabe leerlos', () => {
    // Esto es exactamente lo que bajará el día que se active la fase 2, y es
    // la mitad arriesgada: si fallara, la fase 2 dejaría ilegibles los ajustes
    // de Salidas de toda la congregación.
    for (const original of [buildAjustes(), buildSemana()]) {
      const comoLoSubiraLaFase2 = structuredClone(original);

      for (const campo of PENDIENTES) {
        if (!(campo in comoLoSubiraLaFase2)) continue;
        comoLoSubiraLaFase2[campo] = encryptData(
          JSON.stringify(comoLoSubiraLaFase2[campo]),
          ACCESS_CODE
        );
      }

      // que de verdad haya quedado irreconocible antes de comprobar la vuelta
      expect(JSON.stringify(comoLoSubiraLaFase2)).not.toContain('Elda Oeste');

      decryptObject({
        data: comoLoSubiraLaFase2,
        table: 'service_outings',
        accessCode: ACCESS_CODE,
      });

      expect(comoLoSubiraLaFase2).toEqual(original);
    }
  });

  it('LISTO PARA LA FASE 2: un `false` cifrado vuelve booleano, no cadena', () => {
    // El filo del booleano: si volviera como cadena sería VERDADERO, y la
    // semana saldría como la del superintendente sin serlo.
    const data = {
      weekOf: '2026/10/19',
      isCircuitOverseerWeek: encryptData(JSON.stringify(false), ACCESS_CODE),
    };

    decryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    expect(data.isCircuitOverseerWeek).toBe(false);
  });
});
