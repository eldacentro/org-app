/**
 * Los diez colores con los que se distingue una cosa de otra de un vistazo:
 * las zonas y las etiquetas de Territorios, hoy.
 *
 * Son diez y no más a propósito. Un color aquí no es decoración: es lo que
 * hace que en un mapa con noventa territorios se vea de un golpe cuál es de
 * qué zona. Pasada la docena, dos colores empiezan a parecerse y el mapa deja
 * de decir nada.
 *
 * ── Por qué estos diez ────────────────────────────────────────────────────
 *
 * Los de antes eran el azul de la marca y nueve colores sueltos cogidos de
 * otra paleta. Medidos en OKLCH —el espacio donde una diferencia de número es
 * una diferencia que el ojo ve— la mezcla se notaba: la luminosidad iba de
 * 0,53 a 0,77 y el croma de 0,04 a 0,22. Es decir, el ámbar y el verde
 * BRILLABAN al lado del azul de la app, que se quedaba apagado, y el gris
 * pizarra casi no era un color. Por eso unos parecían chillones y otros
 * tristes: no era el tono, era que cada uno tenía un peso distinto.
 *
 * Estos diez comparten peso. Todos están a **la misma luminosidad (0,56)** y
 * con el **mismo croma (0,145 como tope)**, que son exactamente los del azul
 * de la app (`--accent-main`: 0,556 y 0,140). Así ninguno grita más que otro,
 * y ninguno grita más que la propia aplicación.
 *
 * Dos apaños necesarios, los dos honestos:
 *
 *  · El **ámbar** va a 0,71 en vez de 0,56. Un amarillo a la luminosidad de
 *    los demás es un ocre sucio, no un amarillo. Es la misma licencia que se
 *    da la app con su propio naranja de aviso, que está en 0,709 mientras el
 *    rojo, el verde y el acento rondan 0,53.
 *
 *  · El croma es un TOPE, no un valor fijo: sRGB no llega a 0,145 en los
 *    turquesas y cianes a esta luminosidad, así que ahí se coge el máximo que
 *    la pantalla puede dar (0,10–0,13). Forzarlo saldría fuera de gamut y el
 *    navegador lo recortaría por su cuenta, que es peor.
 *
 * Los tonos están elegidos evitando la franja mostaza (75°–120°), donde a
 * esta luminosidad todo sale oliva y dos "verdes" se confunden.
 *
 * Si algún día hay que tocarlos: el método está en el comentario, no en los
 * números. Misma luminosidad, mismo croma, y el tono es lo único que cambia.
 */
export const PALETA_COLORES = [
  '#306CB4', // azul — el de la marca, `--accent-main`
  '#BA4B47', // rojo
  '#DE8C2A', // ámbar
  '#4C8621', // verde
  '#008A63', // esmeralda
  '#008686', // turquesa
  '#0081A3', // cian
  '#6E65C5', // índigo
  '#8E58B3', // violeta
  '#AA4D8F', // frambuesa
];

/**
 * El color de la paleta más parecido a uno cualquiera.
 *
 * Se compara en OKLab —no en RGB— porque en RGB la distancia entre dos
 * colores no tiene nada que ver con lo distintos que se ven: un salto de 30
 * en el verde se nota muchísimo y el mismo salto en el azul casi no.
 */
const aOklab = (hex: string): [number, number, number] => {
  const v = hex.replace('#', '');
  const canal = (i: number) => {
    const c = parseInt(v.slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const [r, g, b] = [canal(0), canal(1), canal(2)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const distancia = (a: string, b: string): number => {
  const [l1, a1, b1] = aOklab(a);
  const [l2, a2, b2] = aOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/**
 * Reparte los colores de la paleta entre unos cuantos elementos que ya tenían
 * color, dejando a cada uno el más parecido al suyo.
 *
 * Reparte, no traduce: si dos zonas tenían dos verdes casi iguales, darles a
 * las dos el mismo verde de la paleta sería peor que dejarlas como estaban —
 * en el mapa dejarían de distinguirse. Así que cada color de la paleta se usa
 * una sola vez, y quien llega tarde se lleva el siguiente más parecido.
 *
 * Devuelve solo los que CAMBIAN. Si ya estaban todos en la paleta, no
 * devuelve nada.
 */
export const repartirPaleta = <T extends { id: string; color: string }>(
  elementos: T[]
): { id: string; color: string }[] => {
  const yaEnPaleta = new Set(
    elementos.map((e) => e.color).filter((c) => PALETA_COLORES.includes(c))
  );
  const libres = PALETA_COLORES.filter((c) => !yaEnPaleta.has(c));
  const cambios: { id: string; color: string }[] = [];

  // Primero los que menos dudas tienen: el que tiene un favorito clarísimo se
  // lo lleva antes de que otro con menos derecho se lo quede.
  const pendientes = elementos
    .filter((e) => !PALETA_COLORES.includes(e.color))
    .map((e) => ({
      elemento: e,
      orden: Math.min(...PALETA_COLORES.map((c) => distancia(e.color, c))),
    }))
    .sort((x, y) => x.orden - y.orden)
    .map((x) => x.elemento);

  pendientes.forEach((elemento) => {
    const disponibles = libres.length > 0 ? libres : PALETA_COLORES;
    const elegido = disponibles.reduce((mejor, c) =>
      distancia(elemento.color, c) < distancia(elemento.color, mejor)
        ? c
        : mejor
    );

    const i = libres.indexOf(elegido);
    if (i >= 0) libres.splice(i, 1);
    cambios.push({ id: elemento.id, color: elegido });
  });

  return cambios;
};
