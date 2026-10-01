import { describe, expect, it } from 'vitest';
import { filaConId } from './territories';

const doc = (id: string, data: Record<string, unknown>) => ({
  id,
  data: () => data,
});

/**
 * El `id` de un registro de Territorios sale del DOCUMENTO, no de lo que haya
 * escrito dentro.
 *
 * El aviso de «Campaña terminada» se guardaba sin `id` en los campos, y al
 * leerlo llegaba sin identificador: contestar «Sí, lo trabajé» marcaba la
 * asignación pero no podía marcar el aviso como leído, así que la pregunta se
 * quedaba puesta y parecía que el botón no hacía nada.
 */
describe('el id de una fila de Territorios', () => {
  it('sale del documento aunque los campos no lo traigan', () => {
    const fila = filaConId(
      doc('aviso-123', { title: 'Campaña terminada', leido: false })
    );

    expect(fila.id).toBe('aviso-123');
    expect(fila.title).toBe('Campaña terminada');
  });

  it('el del documento manda sobre el que venga en los campos', () => {
    const fila = filaConId(doc('el-de-verdad', { id: 'el-viejo' }));

    expect(fila.id).toBe('el-de-verdad');
  });
});
