import { describe, expect, it } from 'vitest';
import { decryptObject, encryptObject } from '@services/encryption';
import { quitarCifradoSobrante } from './incoming_reports';

/**
 * El informe que el publicador manda al secretario. Se perdía cuando el envío
 * tardaba y se reintentaba: el reintento lo ciframos dos veces y el secretario
 * lo tomaba por retirado (ver incoming_reports.ts).
 */

const ACCESS_CODE = 'clave-de-acceso-de-prueba';

const informe = () => ({
  person_uid: 'uid-esposa',
  report_month: '2026/10',
  bible_studies: 1,
  comments: '',
  hours: 0,
  hours_credits: 0,
  shared_ministry: true,
  updatedAt: '2026-10-31T20:00:00.000Z',
  _deleted: false,
});

const cifrar = <T extends object>(datos: T) =>
  encryptObject({ data: datos, table: 'incoming_reports', accessCode: ACCESS_CODE });

const descifrar = <T extends object>(datos: T) =>
  decryptObject({ data: datos, table: 'incoming_reports', accessCode: ACCESS_CODE });

describe('el informe que llegaba cifrado dos veces', () => {
  it('así se perdía: descifrado una vez, «_deleted» queda como un texto', () => {
    const datos = informe();
    cifrar(datos);
    cifrar(datos);
    descifrar(datos);

    expect(typeof datos._deleted).toBe('string');
    // Un texto cuenta como verdadero: el secretario lo daba por retirado.
    expect(Boolean(datos._deleted)).toBe(true);
  });

  it('el secretario lo recupera entero', () => {
    const datos = informe();
    cifrar(datos);
    cifrar(datos);
    descifrar(datos);

    quitarCifradoSobrante(datos, ACCESS_CODE);

    expect(datos).toEqual(informe());
  });

  it('en la cola: uno ya cifrado vuelve a estar en claro antes de cifrarlo', () => {
    const enLaCola = informe();
    cifrar(enLaCola);

    quitarCifradoSobrante(enLaCola, ACCESS_CODE);

    expect(enLaCola).toEqual(informe());
  });

  it('a un informe normal no le toca nada', () => {
    const datos = informe();
    cifrar(datos);
    descifrar(datos);

    const antes = structuredClone(datos);
    quitarCifradoSobrante(datos, ACCESS_CODE);

    expect(datos).toEqual(antes);
  });

  it('con la clave equivocada no rompe: deja el valor como estaba', () => {
    const datos = informe();
    cifrar(datos);
    const antes = structuredClone(datos);

    quitarCifradoSobrante(datos, 'otra-clave');

    expect(datos).toEqual(antes);
  });
});
