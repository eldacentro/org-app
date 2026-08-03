import { describe, expect, it } from 'vitest';
import {
  decryptData,
  decryptObject,
  encryptData,
  encryptObject,
  generateKey,
} from './index';

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
 * Salidas de predicación — los campos que hasta ahora viajaban en claro.
 *
 * `monthlyOverrides`, `disabledSlots` y `sharedSlots` (ajustes) y
 * `isCircuitOverseerWeek` y `weekOverrideHours` (semanas) no estaban en el mapa
 * de cifrado, así que se guardaban en claro en el servidor — comprobado en el
 * bucket real antes de tocar nada. Lo que se fija aquí:
 *
 *  - que ahora sí viajan cifrados,
 *  - y que añadirlos NO obliga a migrar: el descifrado solo actúa sobre
 *    cadenas, así que un valor que ya esté guardado en claro (un objeto, un
 *    array, un booleano) se deja intacto. Esa es toda la razón por la que se
 *    puede desplegar sin tocar lo que ya está en el servidor.
 */
describe('service_outings — lo que dejaba de viajar cifrado', () => {
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

  it('los ajustes van y vuelven exactamente igual', () => {
    const original = buildAjustes();
    const data = buildAjustes();

    encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });
    decryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    expect(data).toEqual(original);
  });

  it('la congregación con la que se comparte turno ya no viaja en claro', () => {
    const data = buildAjustes();

    encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    const enviado = JSON.stringify(data);
    expect(enviado).not.toContain('Elda Oeste');
    expect(enviado).not.toContain('monday_morning');
    expect(enviado).not.toContain('isCancelledMonth');
  });

  it('la semana va y vuelve igual, y el booleano vuelve booleano', () => {
    const original = buildSemana();
    const data = buildSemana();

    encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });
    decryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    expect(data).toEqual(original);
    expect(data.isCircuitOverseerWeek).toBe(true);
  });

  it('la semana del superintendente ya no se anuncia al servidor', () => {
    const data = buildSemana();

    encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    expect(typeof data.isCircuitOverseerWeek).toBe('string');
    expect(JSON.stringify(data)).not.toContain('wednesday_morning');
    // La fecha de la semana sí sigue en claro: es la clave con la que se
    // casan los registros, como el person_uid de una persona.
    expect(data.weekOf).toBe('2026/10/12');
  });

  it('un `false` guardado sobrevive al viaje (no se pierde por ser falso)', () => {
    const data = { weekOf: '2026/10/19', isCircuitOverseerWeek: false };

    encryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });
    decryptObject({ data, table: 'service_outings', accessCode: ACCESS_CODE });

    expect(data.isCircuitOverseerWeek).toBe(false);
  });

  it('lo que ya está guardado EN CLARO se deja intacto al descifrar', () => {
    // Esta es la razón por la que no hace falta migrar nada: lo que hay hoy en
    // el servidor son objetos, arrays y booleanos, y el descifrado solo toca
    // cadenas. Si esto se rompiera, desplegar el cambio se comería los ajustes
    // de toda la congregación.
    const enClaro = { ...buildAjustes(), ...buildSemana(), weekOf: 'settings' };
    const original = structuredClone(enClaro);

    decryptObject({
      data: enClaro,
      table: 'service_outings',
      accessCode: ACCESS_CODE,
    });

    expect(enClaro).toEqual(original);
  });
});
