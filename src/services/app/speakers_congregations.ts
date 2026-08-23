import { SpeakersCongregationsType } from '@definition/speakers_congregations';

/**
 * Ordenar y completar las congregaciones del catálogo de oradores.
 *
 * Aparte de la pantalla porque son decisiones que se prueban solas y que se
 * equivocan en silencio: un orden que no es el que se espera no da error, solo
 * hace que no encuentres lo que buscas.
 */

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

/**
 * Lo que ya se intentó buscar y no dio nada.
 *
 * EL CASO QUE ESTO ARREGLA: Betel. No pertenece a ningún circuito, así que por
 * mucho que se busque nunca va a tener uno — y la tira de «a 1 congregación le
 * falta el número o el circuito» se quedaba ahí para siempre, pidiendo algo que
 * no existe. Un aviso que no se puede atender enseña a no mirar los avisos.
 *
 * Se guarda EN EL DISPOSITIVO y no en la congregación a propósito: no es un dato
 * de nadie, es «ya he pulsado el botón y no salió nada». No merece viajar por la
 * sincronización ni ocupar un campo nuevo en una tabla cifrada.
 *
 * La marca lleva dentro QUÉ faltaba. Si mañana alguien le borra el número a esa
 * congregación, la situación es otra y se vuelve a preguntar: así esto silencia
 * un caso concreto, no una congregación para siempre.
 */
const YA_INTENTADAS = 'speakers-congregations-sin-suerte';

/** La huella de un hueco concreto en una congregación concreta. */
export const huellaDeFalta = (falta: FaltaEnCongregacion) =>
  `${falta.id}:${falta.faltaNumero ? 'n' : ''}${falta.faltaCircuito ? 'c' : ''}`;

const leerIntentadas = (): string[] => {
  try {
    const guardado = globalThis.localStorage?.getItem(YA_INTENTADAS);

    const lista = guardado ? JSON.parse(guardado) : [];

    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : [];
  } catch {
    // Un almacén ilegible no puede impedir usar la pantalla: se empieza de cero.
    return [];
  }
};

/** Apunta que estas se buscaron y no salió nada. */
export const apuntarSinSuerte = (faltas: FaltaEnCongregacion[]) => {
  if (faltas.length === 0) return;

  try {
    const todas = new Set([...leerIntentadas(), ...faltas.map(huellaDeFalta)]);

    globalThis.localStorage?.setItem(YA_INTENTADAS, JSON.stringify([...todas]));
  } catch {
    // Sin poder apuntarlo, la tira volverá a avisar. Es molesto, no grave.
  }
};

/** Las que todavía tiene sentido preguntar. */
export const faltasPorIntentar = (faltas: FaltaEnCongregacion[]) => {
  const intentadas = new Set(leerIntentadas());

  return faltas.filter((falta) => !intentadas.has(huellaDeFalta(falta)));
};

/** Para las pruebas y para cuando alguien quiera volver a empezar. */
export const olvidarIntentos = () => {
  try {
    globalThis.localStorage?.removeItem(YA_INTENTADAS);
  } catch {
    // nada que hacer
  }
};
