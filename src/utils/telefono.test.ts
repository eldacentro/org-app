import { describe, expect, it } from 'vitest';
import { enlaceWhatsApp, normalizarTelefono } from './telefono';

/**
 * Se prueba porque el fallo no se ve.
 *
 * Un número mal normalizado no da error: abre el chat de OTRA persona, o de
 * nadie, y la hojita se manda a quien no era. El caso que de verdad importa es
 * el último de cada bloque —cuándo hay que devolver `null`—, porque de ahí sale
 * lo que la lista enseña como «sin teléfono» en vez de fallar al pulsar.
 */
describe('el teléfono, de la ficha a WhatsApp', () => {
  it('nueve dígitos con prefijo de móvil: el caso de los 90', () => {
    expect(normalizarTelefono('612345678')).toBe('34612345678');
    expect(normalizarTelefono('722334455')).toBe('34722334455');
  });

  it('los fijos entran igual que los móviles', () => {
    // 8 y 9 son fijos en España. Se aceptan porque están en las fichas y no
    // nos toca a nosotros decidir quién tiene WhatsApp; si no lo tiene, lo
    // dirá WhatsApp al abrir el chat.
    expect(normalizarTelefono('865123456')).toBe('34865123456');
    expect(normalizarTelefono('965123456')).toBe('34965123456');
  });

  it('quita lo que no sea número', () => {
    expect(normalizarTelefono('612 34 56 78')).toBe('34612345678');
    expect(normalizarTelefono('612-34-56-78')).toBe('34612345678');
    expect(normalizarTelefono(' 612345678 ')).toBe('34612345678');
    expect(normalizarTelefono('(612) 345 678')).toBe('34612345678');
  });

  it('no duplica el prefijo si ya venía puesto', () => {
    expect(normalizarTelefono('+34612345678')).toBe('34612345678');
    expect(normalizarTelefono('+34 612 345 678')).toBe('34612345678');
    expect(normalizarTelefono('0034612345678')).toBe('34612345678');
    expect(normalizarTelefono('34612345678')).toBe('34612345678');
  });

  it('las seis fichas sin teléfono no fallan: dicen que no hay', () => {
    expect(normalizarTelefono('')).toBeNull();
    expect(normalizarTelefono('   ')).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
    expect(normalizarTelefono(undefined)).toBeNull();
    // Un texto sin un solo dígito tampoco es un teléfono.
    expect(normalizarTelefono('no tiene')).toBeNull();
  });

  it('antes que adivinar, no devuelve nada', () => {
    // Corto o largo de más: casi siempre un dedazo al teclear.
    expect(normalizarTelefono('61234567')).toBeNull();
    expect(normalizarTelefono('6123456789')).toBeNull();
    // Nueve dígitos pero empezando por donde no empieza ningún número español.
    expect(normalizarTelefono('123456789')).toBeNull();
    expect(normalizarTelefono('512345678')).toBeNull();
    // Dos números en el mismo campo. Elegir uno de los dos sería inventar.
    expect(normalizarTelefono('612345678 / 622334455')).toBeNull();
    // El 34 delante, pero lo que sigue no es un número español.
    expect(normalizarTelefono('34112345678')).toBeNull();
  });

  it('un número extranjero vale SOLO si trae su país escrito', () => {
    // Con `+` se le cree a quien lo escribió.
    expect(normalizarTelefono('+351912345678')).toBe('351912345678');
    expect(normalizarTelefono('00351912345678')).toBe('351912345678');
    // Sin `+`, los mismos dígitos son un error de tecleo, no Portugal.
    expect(normalizarTelefono('351912345678')).toBeNull();
  });

  it('el enlace lleva el mensaje escapado, no pegado', () => {
    const enlace = enlaceWhatsApp('34612345678', 'Hola, Marcos. ¿Te va bien?');

    expect(enlace.startsWith('https://wa.me/34612345678?text=')).toBe(true);
    // Ni espacios ni signos sueltos: irían a parar a la URL y cortarían el
    // mensaje por la mitad.
    expect(enlace).not.toContain(' ');
    expect(decodeURIComponent(enlace.split('?text=')[1])).toBe(
      'Hola, Marcos. ¿Te va bien?'
    );
  });

  it('el salto de línea sobrevive al enlace', () => {
    // El mensaje al ayudante va en tres renglones a propósito: el papel que
    // dice quién es quién tiene que leerse de un vistazo en el chat.
    const enlace = enlaceWhatsApp('34612345678', 'Primera\nSegunda');

    expect(decodeURIComponent(enlace.split('?text=')[1])).toBe(
      'Primera\nSegunda'
    );
  });
});
