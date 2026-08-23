import { SpeakersCongregationsType } from '@definition/speakers_congregations';

/**
 * Ordenar y filtrar las congregaciones del catálogo de oradores.
 *
 * Aparte de la pantalla porque son decisiones que se prueban solas y que se
 * equivocan en silencio: un orden que no es el que se espera no da error, solo
 * hace que no encuentres lo que buscas.
 */

/** Sin circuito apuntado. No es un circuito más: es la falta de uno. */
export const SIN_CIRCUITO = '__sin__';

/**
 * Por nombre, como se busca con el dedo.
 *
 * `localeCompare` en español y no una comparación de textos a secas: sin él la
 * Ñ y las acentuadas se van al final del alfabeto, detrás de la Z. Y `numeric`
 * para que «Grupo 2» vaya antes que «Grupo 10», que como texto van al revés.
 */
export const ordenarPorNombre = (lista: SpeakersCongregationsType[]) =>
  [...lista].sort((a, b) =>
    (a.cong_data.cong_name.value || '').localeCompare(
      b.cong_data.cong_name.value || '',
      'es',
      { numeric: true, sensitivity: 'base' }
    )
  );

/**
 * Los circuitos que hay en esa lista, para poder filtrar por ellos.
 *
 * Las que no llevan circuito apuntado no se tiran: se juntan bajo
 * `SIN_CIRCUITO` y salen al final. Sin eso, filtrar las escondería sin decir
 * nada, y son justo las que hay que revisar.
 */
export const circuitosDeLaLista = (lista: SpeakersCongregationsType[]) => {
  const circuitos = new Set<string>();
  let hayHuerfanas = false;

  for (const cong of lista) {
    const circuito = (cong.cong_data.cong_circuit.value || '').trim();

    if (circuito.length === 0) {
      hayHuerfanas = true;
      continue;
    }

    circuitos.add(circuito);
  }

  const ordenados = [...circuitos].sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
  );

  return hayHuerfanas ? [...ordenados, SIN_CIRCUITO] : ordenados;
};

/** Las de ese circuito. Cadena vacía = todas, que es como empieza el filtro. */
export const filtrarPorCircuito = (
  lista: SpeakersCongregationsType[],
  circuito: string
) => {
  if (!circuito) return lista;

  if (circuito === SIN_CIRCUITO) {
    return lista.filter(
      (cong) => (cong.cong_data.cong_circuit.value || '').trim().length === 0
    );
  }

  return lista.filter(
    (cong) => (cong.cong_data.cong_circuit.value || '').trim() === circuito
  );
};

/** Qué le falta a una congregación del catálogo. */
export type FaltaEnCongregacion = {
  id: string;
  nombre: string;
  faltaNumero: boolean;
  faltaCircuito: boolean;
};

/**
 * Las que tienen huecos que se pueden rellenar solos.
 *
 * El número y el circuito se quedaron en blanco por dos motivos distintos: el
 * formulario de añadir a mano tiraba el número que se escribía, y el buscador de
 * congregaciones no devuelve número ninguno. Las dos cosas están arregladas para
 * las nuevas, pero las que ya estaban se quedaron como estaban.
 *
 * Sin nombre no se puede buscar nada, así que esas no cuentan: saldrían en la
 * lista para no poder hacer nada con ellas.
 */
export const congregacionesIncompletas = (
  lista: SpeakersCongregationsType[]
): FaltaEnCongregacion[] =>
  lista
    .map((cong) => ({
      id: cong.id ?? '',
      nombre: (cong.cong_data.cong_name.value || '').trim(),
      faltaNumero: (cong.cong_data.cong_number.value || '').trim().length === 0,
      faltaCircuito:
        (cong.cong_data.cong_circuit.value || '').trim().length === 0,
    }))
    .filter(
      (falta) =>
        falta.id.length > 0 &&
        falta.nombre.length > 0 &&
        (falta.faltaNumero || falta.faltaCircuito)
    );

/**
 * Deja un nombre de congregación como se puede comparar.
 *
 * Sin mayúsculas, sin acentos y sin signos: «Elda - Centro», «ELDA CENTRO» y
 * «Elda—Centro» son la misma congregación escrita por tres personas distintas.
 */
const limpiarNombre = (nombre: string) =>
  (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * La congregación de la búsqueda que ES esta, o nada.
 *
 * Se exige que haya UNA y solo una con ese nombre. Con dos —pasa: hay nombres
 * repetidos entre provincias— no se elige la primera: se deja el hueco en blanco
 * y que lo rellene una persona. Rellenar el número equivocado es peor que no
 * rellenarlo, porque nadie vuelve a mirar un campo que ya tiene algo.
 */
export const emparejarPorNombre = <T extends { congName: string }>(
  nombre: string,
  resultados: T[]
): T | null => {
  const buscado = limpiarNombre(nombre);

  if (!buscado) return null;

  // `Array.isArray` y no `?? []`: cuando la búsqueda falla, la respuesta trae un
  // objeto de error donde se esperaba una lista, y `.filter` sobre eso revienta.
  // Visto en pruebas.
  const lista = Array.isArray(resultados) ? resultados : [];

  const iguales = lista.filter(
    (record) => limpiarNombre(record?.congName) === buscado
  );

  return iguales.length === 1 ? iguales[0] : null;
};
