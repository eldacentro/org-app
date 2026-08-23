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
