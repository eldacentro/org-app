import { View } from '@react-pdf/renderer';
import { ANCHO, MARGEN, RECORTE } from './surface';

/**
 * La "uñita" de color de un bloque, para los PDF.
 *
 * Es el equivalente en papel de `accentSurface` (`@components/accent_surface`),
 * y existe por lo mismo: **un borde recto pegado al canto de una caja
 * redondeada pelea con la propia esquina**. El color llega arriba, se corta en
 * seco donde empieza la curva y deja dos muescas. Cuanto más redondo el
 * bloque, peor.
 *
 * En la app eso ya estaba resuelto y documentado (DESIGN_SYSTEM §6.3), pero
 * los PDF se habían quedado fuera: los cuatro que marcan un bloque con color
 * —visita del superintendente, Exhibidores, Salidas de predicación y la
 * invitación al orador visitante— lo hacían con `borderLeft`, cada uno con su
 * grosor (2 y 3) sobre bloques con cuatro radios distintos (3, 4, 6 y 8). La
 * misma colección de copias que la app tuvo en su día, mudada al papel.
 *
 * Aquí es una CÁPSULA: una barrita con su propio radio completo, metida dentro
 * del margen y más corta que el bloque. Al no tocar ningún canto no hay nada
 * con lo que pelear, y al ser redonda pertenece a la misma familia de formas
 * que el resto.
 *
 * En la app la cápsula la pinta un `::before`; react-pdf no tiene
 * pseudoelementos, así que va como un `<View>` de verdad, en absoluto, y el
 * bloque que la lleva tiene que ser `position: 'relative'` — de eso se encarga
 * `accentCapsuleSurface`.
 *
 * Uso:
 *
 * ```tsx
 * <View style={[styles.bloque, accentCapsuleSurface()]}>
 *   <AccentCapsule color="#306CB4" />
 *   …
 * </View>
 * ```
 */

const AccentCapsule = ({ color }: { color: string }) => (
  <View
    style={{
      position: 'absolute',
      left: MARGEN,
      top: RECORTE,
      bottom: RECORTE,
      width: ANCHO,
      // Radio completo: react-pdf lo recorta solo a la mitad del ancho, así
      // que sale una cápsula perfecta sin tener que calcular nada.
      borderRadius: 999,
      backgroundColor: color,
    }}
  />
);

export default AccentCapsule;
