import { describe, expect, it } from 'vitest';
import { copiaDeTrabajoTrasCambio } from './ficha_en_edicion';

type Ficha = {
  person_uid: string;
  person_data: {
    nombre: { value: string; updatedAt: string };
    salidas: { value: boolean; updatedAt: string };
    exhibidores: { value: boolean; updatedAt: string };
    ausencias: { id: string; updatedAt: string; _deleted: boolean }[];
  };
};

const ficha = (): Ficha => ({
  person_uid: 'roberto',
  person_data: {
    nombre: { value: 'Roberto', updatedAt: '2026-09-01T10:00:00.000Z' },
    salidas: { value: false, updatedAt: '' },
    exhibidores: { value: false, updatedAt: '' },
    ausencias: [],
  },
});

describe('copiaDeTrabajoTrasCambio', () => {
  it('no toca lo que se está editando si el cambio era de OTRA persona', () => {
    const base = ficha();
    const enEdicion = ficha();
    enEdicion.person_data.salidas = {
      value: true,
      updatedAt: '2026-09-17T09:00:00.000Z',
    };

    // La tabla ha cambiado, pero el registro de Roberto sigue igual.
    const guardada = ficha();

    const resultado = copiaDeTrabajoTrasCambio({ enEdicion, base, guardada });

    // La MISMA referencia: ni se pierde el tick ni se redibuja nada.
    expect(resultado).toBe(enEdicion);
    expect(resultado.person_data.salidas.value).toBe(true);
  });

  it('toma lo guardado cuando no había nada a medio editar', () => {
    const base = ficha();
    const enEdicion = ficha();
    const guardada = ficha();
    guardada.person_data.nombre = {
      value: 'Roberto José',
      updatedAt: '2026-09-17T08:00:00.000Z',
    };

    const resultado = copiaDeTrabajoTrasCambio({ enEdicion, base, guardada });

    expect(resultado).toBe(guardada);
  });

  it('conserva el tick sin guardar Y recibe lo que otro cambió en la misma ficha', () => {
    const base = ficha();

    const enEdicion = ficha();
    enEdicion.person_data.salidas = {
      value: true,
      updatedAt: '2026-09-17T09:00:00.000Z',
    };

    // Mientras tanto, desde otro dispositivo le han corregido el nombre y el
    // propio hermano ha apuntado una ausencia.
    const guardada = ficha();
    guardada.person_data.nombre = {
      value: 'Roberto José',
      updatedAt: '2026-09-17T08:59:00.000Z',
    };
    guardada.person_data.ausencias = [
      { id: 'a1', updatedAt: '2026-09-17T08:58:00.000Z', _deleted: false },
    ];

    const resultado = copiaDeTrabajoTrasCambio({ enEdicion, base, guardada });

    expect(resultado.person_data.salidas.value).toBe(true);
    expect(resultado.person_data.nombre.value).toBe('Roberto José');
    expect(resultado.person_data.ausencias).toHaveLength(1);
  });

  it('si los dos tocaron el MISMO campo, gana el más nuevo', () => {
    const base = ficha();

    const enEdicion = ficha();
    enEdicion.person_data.exhibidores = {
      value: true,
      updatedAt: '2026-09-17T09:00:00.000Z',
    };

    const guardada = ficha();
    guardada.person_data.exhibidores = {
      value: false,
      updatedAt: '2026-09-17T09:05:00.000Z',
    };

    const resultado = copiaDeTrabajoTrasCambio({ enEdicion, base, guardada });

    expect(resultado.person_data.exhibidores.value).toBe(false);
  });

  it('después de Guardar no cambia nada: lo guardado es lo que hay en pantalla', () => {
    const base = ficha();

    const enEdicion = ficha();
    enEdicion.person_data.salidas = {
      value: true,
      updatedAt: '2026-09-17T09:00:00.000Z',
    };

    const guardada = structuredClone(enEdicion);

    const resultado = copiaDeTrabajoTrasCambio({ enEdicion, base, guardada });

    expect(resultado).toBe(enEdicion);
  });

  it('no modifica ninguna de las tres entradas', () => {
    const base = ficha();
    const enEdicion = ficha();
    enEdicion.person_data.salidas = {
      value: true,
      updatedAt: '2026-09-17T09:00:00.000Z',
    };
    const guardada = ficha();
    guardada.person_data.nombre = {
      value: 'Roberto José',
      updatedAt: '2026-09-17T08:59:00.000Z',
    };

    const copias = structuredClone({ base, enEdicion, guardada });

    copiaDeTrabajoTrasCambio({ enEdicion, base, guardada });

    expect({ base, enEdicion, guardada }).toEqual(copias);
  });
});
