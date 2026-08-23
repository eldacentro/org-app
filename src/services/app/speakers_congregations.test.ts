import { beforeEach, describe, expect, it } from 'vitest';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import {
  apuntarSinSuerte,
  congregacionesIncompletas,
  emparejarPorNombre,
  faltasPorIntentar,
  olvidarIntentos,
  ordenarPorNombre,
  type FaltaEnCongregacion,
} from './speakers_congregations';

const cong = (nombre: string, circuito = ''): SpeakersCongregationsType =>
  ({
    _deleted: { value: false, updatedAt: '' },
    id: nombre,
    cong_data: {
      cong_name: { value: nombre, updatedAt: '' },
      cong_circuit: { value: circuito, updatedAt: '' },
    },
  }) as SpeakersCongregationsType;

const nombres = (lista: SpeakersCongregationsType[]) =>
  lista.map((record) => record.cong_data.cong_name.value);

describe('ordenarPorNombre', () => {
  it('ordena alfabéticamente', () => {
    const lista = [cong('Petrer'), cong('Elda - Centro'), cong('Monóvar')];

    expect(nombres(ordenarPorNombre(lista))).toEqual([
      'Elda - Centro',
      'Monóvar',
      'Petrer',
    ]);
  });

  it('no manda los acentos ni la ñ al final del alfabeto', () => {
    // Comparando textos a secas, «Ñ» y «Ó» van detrás de la Z porque su número
    // es mayor. En una lista de congregaciones españolas eso se nota enseguida.
    const lista = [cong('Zaragoza'), cong('Ñora, La'), cong('Óbila')];

    expect(nombres(ordenarPorNombre(lista))).toEqual([
      'Ñora, La',
      'Óbila',
      'Zaragoza',
    ]);
  });

  it('cuenta los números como números', () => {
    const lista = [cong('Grupo 10'), cong('Grupo 2')];

    expect(nombres(ordenarPorNombre(lista))).toEqual(['Grupo 2', 'Grupo 10']);
  });

  it('no toca la lista que le dan', () => {
    // `sort` ordena en el sitio. Si esto reordenara el array de Dexie/Jotai,
    // reordenaría también lo que ven las demás pantallas.
    const lista = [cong('Petrer'), cong('Elda')];

    ordenarPorNombre(lista);

    expect(nombres(lista)).toEqual(['Petrer', 'Elda']);
  });

  it('aguanta una congregación sin nombre', () => {
    expect(() => ordenarPorNombre([cong(''), cong('Elda')])).not.toThrow();
  });
});

describe('congregacionesIncompletas', () => {
  const conNumero = (
    nombre: string,
    numero: string,
    circuito: string
  ): SpeakersCongregationsType =>
    ({
      _deleted: { value: false, updatedAt: '' },
      id: nombre,
      cong_data: {
        cong_name: { value: nombre, updatedAt: '' },
        cong_number: { value: numero, updatedAt: '' },
        cong_circuit: { value: circuito, updatedAt: '' },
      },
    }) as SpeakersCongregationsType;

  it('saca las que les falta algo y dice qué', () => {
    const lista = [
      conNumero('Completa', '9357', 'ESP-Alicante-03A'),
      conNumero('Sin número', '', 'ESP-Alicante-03A'),
      conNumero('Sin circuito', '315', ''),
      conNumero('Sin nada', '', ''),
    ];

    expect(congregacionesIncompletas(lista)).toEqual([
      {
        id: 'Sin número',
        nombre: 'Sin número',
        faltaNumero: true,
        faltaCircuito: false,
      },
      {
        id: 'Sin circuito',
        nombre: 'Sin circuito',
        faltaNumero: false,
        faltaCircuito: true,
      },
      { id: 'Sin nada', nombre: 'Sin nada', faltaNumero: true, faltaCircuito: true },
    ]);
  });

  it('un valor de solo espacios es un hueco', () => {
    expect(congregacionesIncompletas([conNumero('Una', '  ', ' ')])).toHaveLength(
      1
    );
  });

  it('sin nombre no entra: no habría con qué buscarla', () => {
    expect(congregacionesIncompletas([conNumero('', '', '')])).toEqual([]);
  });
});

describe('emparejarPorNombre', () => {
  const r = (congName: string) => ({ congName });

  it('encuentra la que se llama igual', () => {
    expect(
      emparejarPorNombre('Elda - Centro', [
        r('Elda - Este'),
        r('Elda - Centro'),
        r('Elda - Norte'),
      ])
    ).toEqual(r('Elda - Centro'));
  });

  it('le da igual cómo esté escrito', () => {
    expect(emparejarPorNombre('ELDA CENTRO', [r('Elda - Centro')])).toEqual(
      r('Elda - Centro')
    );
    expect(emparejarPorNombre('Monóvar', [r('MONOVAR')])).toEqual(r('MONOVAR'));
  });

  it('con dos iguales no elige: prefiere dejar el hueco', () => {
    // Rellenar el número equivocado es peor que no rellenarlo, porque nadie
    // vuelve a mirar un campo que ya tiene algo dentro.
    expect(
      emparejarPorNombre('Centro', [r('Centro'), r('Centro')])
    ).toBeNull();
  });

  it('sin coincidencia exacta no se conforma con parecerse', () => {
    expect(emparejarPorNombre('Elda', [r('Elda - Centro')])).toBeNull();
  });

  it('aguanta una lista vacía o un nombre vacío', () => {
    expect(emparejarPorNombre('Elda', [])).toBeNull();
    expect(emparejarPorNombre('', [r('Elda')])).toBeNull();
    expect(emparejarPorNombre('Elda', undefined)).toBeNull();
  });
});

describe('emparejarPorNombre con respuestas raras', () => {
  it('no revienta si en vez de una lista llega un objeto de error', () => {
    // Pasa de verdad: cuando la búsqueda de congregaciones falla, la respuesta
    // trae `{ message: … }` donde se esperaba la lista.
    const respuesta = { message: 'error_api_bad-request' } as never;

    expect(() => emparejarPorNombre('Elda', respuesta)).not.toThrow();
    expect(emparejarPorNombre('Elda', respuesta)).toBeNull();
  });

  it('se salta un resultado sin nombre en vez de caerse', () => {
    expect(
      emparejarPorNombre('Elda - Centro', [
        {} as { congName: string },
        { congName: 'Elda - Centro' },
      ])
    ).toEqual({ congName: 'Elda - Centro' });
  });
});

/**
 * Betel no pertenece a ningún circuito, así que buscarle uno no va a dar nada
 * nunca — y la tira se quedaba pidiéndolo para siempre.
 */
describe('lo que ya se intentó y no dio nada', () => {
  const falta = (
    id: string,
    faltaNumero = true,
    faltaCircuito = true
  ): FaltaEnCongregacion => ({
    id,
    nombre: id,
    faltaNumero,
    faltaCircuito,
  });

  beforeEach(() => {
    const almacen = new Map<string, string>();

    // `localStorage` no existe en Node, y estas funciones tienen que
    // sobrevivirlo: por eso leen a través de `globalThis`.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => almacen.get(k) ?? null,
        setItem: (k: string, v: string) => almacen.set(k, v),
        removeItem: (k: string) => almacen.delete(k),
      },
    });

    olvidarIntentos();
  });

  it('al principio se pregunta por todas', () => {
    const faltas = [falta('betel'), falta('elda')];

    expect(faltasPorIntentar(faltas)).toHaveLength(2);
  });

  it('lo apuntado deja de preguntarse', () => {
    apuntarSinSuerte([falta('betel')]);

    expect(faltasPorIntentar([falta('betel'), falta('elda')])).toEqual([
      falta('elda'),
    ]);
  });

  it('si cambia lo que falta, se vuelve a preguntar', () => {
    // Se buscó cuando le faltaban las dos cosas. Si mañana solo le falta el
    // circuito, es otra situación y merece otro intento.
    apuntarSinSuerte([falta('betel', true, true)]);

    expect(faltasPorIntentar([falta('betel', false, true)])).toHaveLength(1);
  });

  it('olvidar los intentos los devuelve todos', () => {
    apuntarSinSuerte([falta('betel')]);
    olvidarIntentos();

    expect(faltasPorIntentar([falta('betel')])).toHaveLength(1);
  });

  it('un almacén con basura dentro no rompe la pantalla', () => {
    globalThis.localStorage.setItem(
      'speakers-congregations-sin-suerte',
      'esto no es json'
    );

    expect(() => faltasPorIntentar([falta('betel')])).not.toThrow();
    expect(faltasPorIntentar([falta('betel')])).toHaveLength(1);
  });

  it('sin almacén ninguno tampoco rompe', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    expect(() => apuntarSinSuerte([falta('betel')])).not.toThrow();
    expect(faltasPorIntentar([falta('betel')])).toHaveLength(1);
  });
});
