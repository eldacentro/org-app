/**
 * Cómo es la pantalla en la que se está dibujando la app.
 *
 * Aquí vive UNA sola pregunta, escrita una vez para el CSS y para el JS: ¿van
 * las acciones de la página en un CARRIL a la derecha, en vez de en la píldora
 * de abajo o en la barra de arriba? Es lo que Apple hace con sus controles en
 * el iPhone Duo, y responde que sí en dos poses:
 *
 * 1. Un teléfono corto y ancho, sostenido en vertical: la pantalla EXTERIOR
 *    del Duo plegado (466×678 en Safari, proporción 0,69). Ahí lo que escasea
 *    es la altura, y la píldora flotando abajo se comía una sexta parte.
 *    Un iPhone normal es mucho más alargado (0,46; el SE viejo, 0,56), así que
 *    ninguno entra.
 * 2. Una pantalla táctil ancha y baja, en horizontal: la pantalla INTERIOR del
 *    Duo abierto y girado (890×626). Aquí no es por espacio —la barra de
 *    arriba cabe de sobra— sino por costumbre, que es el argumento de Apple:
 *    cerrado, los botones están a la derecha; abres el teléfono y siguen en el
 *    mismo sitio, a la misma altura, sin tener que volver a buscarlos. Un iPad
 *    apaisado es más alto (744 el mini) y se queda con su barra de arriba; un
 *    teléfono apaisado es mucho más bajo (440 como mucho) y también.
 *
 * Y responde que NO en la interior en vertical (626×890): ahí Apple mantiene
 * las barras horizontales, porque altura hay de sobra.
 *
 * Los trozos, y por qué cada uno:
 *   · `any-pointer: coarse`  — se maneja con el dedo. Deja fuera cualquier
 *                              ventana de escritorio.
 *   · pose 1: `portrait`, `max-width: 599px` (compacto) y
 *             `min-aspect-ratio: 5/8` (0,625: más ancho respecto a su alto
 *             que cualquier iPhone, y más estrecho que el Duo).
 *   · pose 2: `landscape`, `min-width: 800px`, y alto entre 560 y 700: por
 *             encima de un teléfono girado, por debajo de cualquier iPad.
 *
 * La MISMA cadena está escrita en `global/index.css`; si se toca una, se toca
 * la otra. No se puede importar desde CSS, así que se deja dicho aquí.
 */
export const CARRIL_LATERAL_QUERY =
  '(any-pointer: coarse) and (orientation: portrait) and (max-width: 599px) and (min-aspect-ratio: 5/8), (any-pointer: coarse) and (orientation: landscape) and (min-width: 800px) and (min-height: 560px) and (max-height: 700px)';
