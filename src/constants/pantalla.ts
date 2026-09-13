/**
 * Cómo es la pantalla en la que se está dibujando la app.
 *
 * Aquí vive UNA sola pregunta, escrita una vez para el CSS y para el JS: ¿es un
 * teléfono corto y ancho, sostenido en vertical? Es la pantalla EXTERIOR de un
 * iPhone Duo plegado (466×678 en Safari, proporción 0,69) y la de otros
 * plegables cerrados. Un iPhone normal es mucho más alargado (0,46; el SE
 * viejo, 0,56), así que ninguno entra.
 *
 * Por qué importa: en esa pantalla lo que escasea es la ALTURA, y una barra de
 * acciones flotando abajo se come una sexta parte. Apple, en sus pautas para el
 * Duo, se lleva los controles a una tira vertical del lado derecho, al alcance
 * del pulgar; aquí se hace lo mismo con la píldora de acciones de cada página:
 * pasa a ser un carril a la derecha, con los botones solo con icono (ver
 * `layouts/bottom_menu` y el bloque «CARRIL LATERAL» de `global/index.css`).
 *
 * Los tres trozos, y por qué cada uno:
 *   · `any-pointer: coarse`  — se maneja con el dedo. Deja fuera cualquier
 *                              ventana de escritorio estrecha.
 *   · `orientation: portrait` y `max-width: 599px` — en vertical y compacto.
 *                              De 600 para arriba las acciones ya van en la
 *                              barra superior y no hay píldora que mover.
 *   · `min-aspect-ratio: 5/8` — 0,625: más ancho respecto a su alto que
 *                              cualquier iPhone, y más estrecho que el Duo.
 *
 * La MISMA cadena está escrita en `global/index.css`; si se toca una, se toca
 * la otra. No se puede importar desde CSS, así que se deja dicho aquí.
 */
export const CARRIL_LATERAL_QUERY =
  '(any-pointer: coarse) and (orientation: portrait) and (max-width: 599px) and (min-aspect-ratio: 5/8)';
