import { ReactNode } from 'react';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { IconLogo } from '@views/components/icons';
import { PDF, PDF_PADDING } from '@views/components/pdf_theme';

/**
 * La cabecera y el pie que comparten todos los PDF que diseña la app.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Había TRES cabeceras distintas para el mismo trabajo: Responsabilidades y la
 * Visita del superintendente con barra de marca + título; Exhibidores y
 * Salidas de predicación con el logotipo grande y el título al lado; Fin de
 * semana y Discursos salientes con una tercera. Y cuatro pies: unos con la
 * congregación y la fecha, otros solo con el nombre, otros con nada.
 *
 * Puestas dos hojas juntas no parecían de la misma aplicación, que es
 * exactamente el problema que el sistema de diseño resolvió en la pantalla.
 *
 * ── El dibujo ────────────────────────────────────────────────────────────
 *
 * Arriba, una barra de marca de una línea: logotipo, nombre de la congregación
 * y, a la derecha, de qué va la hoja (el mes, el rango de semanas…). Debajo,
 * una línea fina, y luego el título grande con su subtítulo.
 *
 * Abajo, en absoluto para que no lo empuje el contenido: la congregación a la
 * izquierda y, a la derecha, la última actualización o el número de página.
 *
 * Los formularios OFICIALES no lo usan.
 */

const styles = StyleSheet.create({
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: PDF.ink,
  },
  meta: {
    fontSize: 8.5,
    fontWeight: 500,
    color: PDF.muted,
  },
  divider: {
    borderBottom: `1px solid ${PDF.accentLine}`,
    marginBottom: 11,
  },
  title: {
    fontSize: 21,
    fontWeight: 700,
    color: PDF.ink,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: 600,
    color: PDF.accent,
  },
  titleBlock: {
    marginBottom: 16,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: PDF_PADDING,
    right: PDF_PADDING,
    borderTop: `0.5px solid ${PDF.line}`,
    paddingTop: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: PDF.faint,
  },
});

export const PdfHeader = ({
  congregation,
  meta,
  title,
  subtitle,
  logoSize = 22,
}: {
  congregation: string;
  /** A la derecha de la barra: el mes, el rango de semanas… */
  meta?: string;
  title: string;
  subtitle?: ReactNode;
  logoSize?: number;
}) => (
  <View>
    <View style={styles.topBar}>
      <View style={styles.brand}>
        <IconLogo size={logoSize} />
        <Text style={styles.brandName}>{congregation}</Text>
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>

    <View style={styles.divider} />

    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      {typeof subtitle === 'string' ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : (
        subtitle
      )}
    </View>
  </View>
);

/**
 * `paginado` enseña "Página 1 de 2" cuando hay más de una hoja, y `meta`
 * cuando solo hay una. Sin `paginado`, `meta` siempre.
 */
export const PdfFooter = ({
  congregation,
  meta,
  paginado = false,
  inset = PDF_PADDING,
}: {
  congregation: string;
  meta?: string;
  paginado?: boolean;
  /**
   * A qué distancia del canto. Por omisión, el margen de página estándar; las
   * hojas apaisadas (los calendarios de Exhibidores y Salidas) usan un margen
   * más estrecho para ganar ancho, y el pie tiene que ir a ras de SU margen,
   * no del de las demás.
   */
  inset?: number;
}) => (
  <View style={[styles.footer, { left: inset, right: inset }]} fixed>
    <Text style={styles.footerText}>{congregation}</Text>
    {paginado ? (
      <Text
        style={styles.footerText}
        fixed
        render={({ pageNumber, totalPages }) =>
          totalPages > 1 ? `Página ${pageNumber} de ${totalPages}` : (meta ?? '')
        }
      />
    ) : meta ? (
      <Text style={styles.footerText}>{meta}</Text>
    ) : null}
  </View>
);
