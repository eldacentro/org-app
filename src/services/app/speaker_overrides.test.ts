import { describe, expect, it } from 'vitest';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import {
  aplicarCorrecciones,
  correccionRedundante,
  discursosVigentes,
  type SpeakerOverride,
} from './speaker_overrides';

/**
 * Las correcciones a los discursos de un orador del circuito.
 *
 * Lo que se comprueba aquí es lo que costaría una llamada de teléfono si
 * fallara: que la lista corregida sea la que se ve, que no se pierdan las
 * canciones que ya tenía apuntadas esta congregación, y que un orador sin
 * corrección no se toque.
 */

const orador = (uid: string, talks: number[]): VisitingSpeakerType =>
  ({
    person_uid: uid,
    _deleted: { value: false, updatedAt: '' },
    speaker_data: {
      cong_id: 'circuito-1',
      talks: talks.map((n) => ({
        _deleted: false,
        updatedAt: '2026-01-01',
        talk_number: n,
        talk_songs: [],
      })),
    },
  }) as unknown as VisitingSpeakerType;

const correccion = (speakerUid: string, talks: number[]): SpeakerOverride => ({
  speakerUid,
  talks,
  updatedAt: '2026-08-23T10:00:00.000Z',
});

describe('lo que se ve es la lista corregida', () => {
  it('añade los que el Sheet no trae', () => {
    const [resultado] = aplicarCorrecciones(
      [orador('a', [10, 20])],
      [correccion('a', [10, 20, 42])]
    );

    expect(discursosVigentes(resultado)).toEqual([10, 20, 42]);
  });

  it('quita los que ya no da', () => {
    // Esto es lo que no se podía hacer de ninguna manera: el Sheet lo traía y
    // volvía cada madrugada.
    const [resultado] = aplicarCorrecciones(
      [orador('a', [10, 20, 30])],
      [correccion('a', [10, 30])]
    );

    expect(discursosVigentes(resultado)).toEqual([10, 30]);
  });

  it('lo quitado se marca borrado, no se tira', () => {
    // Si mañana el Sheet vuelve a traerlo, sus canciones siguen donde estaban.
    const [resultado] = aplicarCorrecciones(
      [orador('a', [10, 20])],
      [correccion('a', [10])]
    );

    const veinte = resultado.speaker_data.talks.find(
      (t) => t.talk_number === 20
    );

    expect(veinte).toBeDefined();
    expect(veinte?._deleted).toBe(true);
  });
});

describe('las canciones que ya había apuntadas', () => {
  it('NO se pierden al corregir la lista', () => {
    // Las canciones las pone esta congregación y son trabajo suyo; no tienen
    // nada que ver con que la lista de discursos estuviera mal.
    const conCanciones = orador('a', [10, 20]);
    conCanciones.speaker_data.talks[0].talk_songs = [88, 120];

    const [resultado] = aplicarCorrecciones(
      [conCanciones],
      [correccion('a', [10, 42])]
    );

    const diez = resultado.speaker_data.talks.find((t) => t.talk_number === 10);

    expect(diez?.talk_songs).toEqual([88, 120]);
  });

  it('vuelven si se recupera un discurso que se había quitado', () => {
    const conCanciones = orador('a', [10]);
    conCanciones.speaker_data.talks[0].talk_songs = [88];

    const quitado = aplicarCorrecciones([conCanciones], [correccion('a', [])]);
    const recuperado = aplicarCorrecciones(quitado, [correccion('a', [10])]);

    const diez = recuperado[0].speaker_data.talks.find(
      (t) => t.talk_number === 10
    );

    expect(diez?._deleted).toBe(false);
    expect(diez?.talk_songs).toEqual([88]);
  });
});

describe('a quien no se ha corregido no se le toca', () => {
  it('se devuelve el MISMO objeto, no una copia', () => {
    // Copiarlo haría que React redibujara medio catálogo cada vez que llega
    // una corrección de otro hermano.
    const sinTocar = orador('b', [1, 2]);

    const [resultado] = aplicarCorrecciones(
      [sinTocar],
      [correccion('a', [10])]
    );

    expect(resultado).toBe(sinTocar);
  });

  it('sin correcciones se devuelve la lista tal cual', () => {
    const lista = [orador('a', [1])];

    expect(aplicarCorrecciones(lista, [])).toBe(lista);
  });
});

describe('cuándo sobra la corrección', () => {
  it('cuando el Sheet acaba diciendo lo mismo', () => {
    expect(
      correccionRedundante(orador('a', [10, 42]), correccion('a', [42, 10]))
    ).toBe(true);
  });

  it('mientras discrepen, no sobra', () => {
    expect(
      correccionRedundante(orador('a', [10, 20]), correccion('a', [10, 42]))
    ).toBe(false);

    expect(
      correccionRedundante(orador('a', [10]), correccion('a', [10, 42]))
    ).toBe(false);
  });

  it('sin orador o sin corrección, no se dice nada', () => {
    expect(correccionRedundante(undefined, correccion('a', [1]))).toBe(false);
    expect(correccionRedundante(orador('a', [1]), undefined)).toBe(false);
  });
});
