import { describe, expect, it } from 'vitest';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import {
  circuitosDeLaLista,
  congregacionesIncompletas,
  emparejarPorNombre,
  filtrarPorCircuito,
  ordenarPorNombre,
  SIN_CIRCUITO,
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

describe('circuitosDeLaLista', () => {
  it('los da una sola vez y ordenados', () => {
    const lista = [
      cong('Elche - Sur', 'ESP-Alicante-04A'),
      cong('Elda - Norte', 'ESP-Alicante-03A'),
      cong('Elche - Centro', 'ESP-Alicante-04A'),
    ];

    expect(circuitosDeLaLista(lista)).toEqual([
      'ESP-Alicante-03A',
      'ESP-Alicante-04A',
    ]);
  });

  it('pone al final el cajón de las que no tienen circuito', () => {
    const lista = [cong('Sin nada'), cong('Elda - Norte', 'ESP-Alicante-03A')];

    expect(circuitosDeLaLista(lista)).toEqual([
      'ESP-Alicante-03A',
      SIN_CIRCUITO,
    ]);
  });

  it('no inventa ese cajón si todas tienen circuito', () => {
    const lista = [cong('Elda - Norte', 'ESP-Alicante-03A')];

    expect(circuitosDeLaLista(lista)).toEqual(['ESP-Alicante-03A']);
  });

  it('un circuito escrito con espacios de más es el mismo circuito', () => {
    const lista = [
      cong('Una', ' ESP-Alicante-03A '),
      cong('Otra', 'ESP-Alicante-03A'),
    ];

    expect(circuitosDeLaLista(lista)).toEqual(['ESP-Alicante-03A']);
  });

  it('un circuito que son solo espacios cuenta como sin circuito', () => {
    expect(circuitosDeLaLista([cong('Una', '   ')])).toEqual([SIN_CIRCUITO]);
  });
});

describe('filtrarPorCircuito', () => {
  const lista = [
    cong('Elda - Norte', 'ESP-Alicante-03A'),
    cong('Elche - Sur', 'ESP-Alicante-04A'),
    cong('Suelta'),
  ];

  it('sin filtro, todas', () => {
    expect(filtrarPorCircuito(lista, '')).toHaveLength(3);
  });

  it('filtra por circuito', () => {
    expect(nombres(filtrarPorCircuito(lista, 'ESP-Alicante-04A'))).toEqual([
      'Elche - Sur',
    ]);
  });

  it('el cajón de las que no tienen circuito trae solo esas', () => {
    expect(nombres(filtrarPorCircuito(lista, SIN_CIRCUITO))).toEqual([
      'Suelta',
    ]);
  });

  it('un circuito que no está en la lista no devuelve nada, no todas', () => {
    // El fallo fácil aquí es tratar «no encontrado» como «sin filtro» y
    // enseñarlas todas: parecería que el filtro no hace nada.
    expect(filtrarPorCircuito(lista, 'ESP-Madrid-01A')).toHaveLength(0);
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
