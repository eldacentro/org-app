import { describe, expect, it } from 'vitest';
import { horaATexto, textoAHora } from './date';

/**
 * El puente entre la hora que se GUARDA (texto "HH:mm", que es lo que viaja en
 * la sincronización) y el `Date` que pide el selector de hora.
 *
 * Se prueba porque no es un detalle de pantalla: lo que devuelve `horaATexto`
 * se escribe en el registro de la visita del superintendente y se sincroniza a
 * todos los dispositivos de la congregación. Un cero perdido o un `Invalid
 * Date` colándose de vuelta como texto se lleva por delante la hora de una
 * reunión.
 */
describe('la hora, de texto a Date y de vuelta', () => {
  it('ida y vuelta sin perder nada', () => {
    for (const hora of ['00:00', '07:05', '09:30', '13:00', '19:45', '23:59']) {
      expect(horaATexto(textoAHora(hora))).toBe(hora);
    }
  });

  it('rellena con cero a la izquierda', () => {
    expect(horaATexto(new Date(1970, 0, 1, 7, 5))).toBe('07:05');
    expect(horaATexto(new Date(1970, 0, 1, 0, 0))).toBe('00:00');
  });

  it('lee una hora escrita sin el cero', () => {
    expect(horaATexto(textoAHora('7:5'))).toBe('07:05');
  });

  it('devuelve cadena vacía en vez de "Invalid Date"', () => {
    expect(horaATexto(null)).toBe('');
    expect(horaATexto(undefined)).toBe('');
    expect(horaATexto(new Date('esto no es una fecha'))).toBe('');
  });

  it('no inventa una hora cuando no hay ninguna', () => {
    expect(textoAHora('')).toBeNull();
    expect(textoAHora(undefined)).toBeNull();
    expect(textoAHora('no es una hora')).toBeNull();
  });

  it('solo mira la hora y los minutos, no la fecha', () => {
    const a = textoAHora('19:30');
    expect(a?.getHours()).toBe(19);
    expect(a?.getMinutes()).toBe(30);
  });
});
