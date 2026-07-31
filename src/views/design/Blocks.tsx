import { ReactNode } from 'react';
import { Style } from '@react-pdf/stylesheet';
import { Text, View } from '@react-pdf/renderer';
import { color, radius, space, stroke, text } from './tokens';
import { CAPSULA, withCapsule } from './capsule';

/**
 * Las piezas que van DENTRO de una hoja: sección, tarjeta, bloque destacado,
 * etiqueta de estado y la cápsula de color.
 *
 * La regla que las gobierna a todas: **nada rectangular toca la esquina de
 * nada redondeado**, y **ningún borde hace de decoración**. Un borde delimita;
 * si lo que se quiere es marcar con color, eso es una cápsula.
 */

// ── Sección ───────────────────────────────────────────────────────────────

/**
 * Un tramo de la hoja con su rótulo en versalitas y su regla.
 *
 * `minPresenceAhead` evita que un rótulo se quede solo al final de una página
 * con su contenido en la siguiente.
 */
export const PdfSection = ({
  title,
  dense = false,
  children,
}: {
  title: string;
  dense?: boolean;
  children: ReactNode;
}) => (
  <View
    minPresenceAhead={48}
    style={{ marginBottom: dense ? space.md + 1 : space.lg + 1 }}
  >
    <Text
      style={{
        ...text.section,
        borderBottom: `${stroke.thin}px solid ${color.accentLine}`,
        paddingBottom: space.xs + 1,
        marginBottom: space.md,
      }}
    >
      {title}
    </Text>
    {children}
  </View>
);

// ── Cápsula de color ──────────────────────────────────────────────────────

/**
 * La "uñita" de color, hecha cápsula.
 *
 * Un borde recto pegado al canto de una caja redondeada pelea con la propia
 * esquina: el color llega arriba, se corta en seco donde empieza la curva y
 * deja dos muescas. Esto es una barrita con su propio radio, metida dentro del
 * margen y más corta que el bloque, así que no toca ningún canto.
 */
export const PdfCapsule = ({ color: c }: { color: string }) => (
  <View
    style={{
      position: 'absolute',
      left: CAPSULA.margen,
      top: CAPSULA.recorte,
      bottom: CAPSULA.recorte,
      width: CAPSULA.ancho,
      borderRadius: radius.full,
      backgroundColor: c,
    }}
  />
);

// ── Tarjeta ───────────────────────────────────────────────────────────────

/**
 * Una superficie con su marco. Para agrupar lo que va junto: un grupo de
 * predicación, una semana del programa, una ficha de persona.
 */
export const PdfCard = ({
  title,
  meta,
  children,
  style,
}: {
  title?: string;
  meta?: string;
  children: ReactNode;
  style?: Style;
}) => (
  <View
    wrap={false}
    style={{
      borderRadius: radius.lg,
      border: `${stroke.thin}px solid ${color.line}`,
      backgroundColor: color.white,
      overflow: 'hidden',
      ...style,
    }}
  >
    {title ? (
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: space.sm + 1,
          paddingHorizontal: space.lg,
          backgroundColor: color.accentSoft,
        }}
      >
        <Text style={text.heading}>{title}</Text>
        {meta ? <Text style={text.meta}>{meta}</Text> : null}
      </View>
    ) : null}
    <View style={{ padding: space.lg }}>{children}</View>
  </View>
);

/**
 * Un bloque destacado dentro de una sección: una cita, un aviso, un dato que
 * hay que mirar. Lleva su cápsula de color a la izquierda.
 */
export const PdfNote = ({
  accent = color.accent,
  soft = color.accentSoft,
  children,
  style,
}: {
  accent?: string;
  soft?: string;
  children: ReactNode;
  style?: Style;
}) => (
  <View
    wrap={false}
    style={{
      backgroundColor: soft,
      borderRadius: radius.md,
      paddingVertical: space.sm + 2,
      paddingRight: space.md + 2,
      marginBottom: space.sm,
      ...withCapsule(),
      ...style,
    }}
  >
    <PdfCapsule color={accent} />
    {children}
  </View>
);

// ── Etiqueta de estado ────────────────────────────────────────────────────

/**
 * Una píldora de estado: "Suspendido", "Sin asignar", "Precursor".
 *
 * Solo para ESTADOS. Si el color no significa nada, no es una etiqueta: es
 * decoración, y entonces sobra.
 */
export const PdfBadge = ({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';
}) => {
  const tonos = {
    neutral: { fg: color.muted, bg: color.surfaceMuted },
    accent: { fg: color.accentInk, bg: color.accentSoft },
    ok: { fg: color.ok, bg: color.okSoft },
    warn: { fg: color.warn, bg: color.warnSoft },
    danger: { fg: color.danger, bg: color.dangerSoft },
  }[tone];

  return (
    <View
      style={{
        backgroundColor: tonos.bg,
        borderRadius: radius.full,
        paddingVertical: 1.5,
        paddingHorizontal: space.sm + 1,
      }}
    >
      <Text style={{ ...text.label, fontSize: 7, color: tonos.fg }}>
        {children}
      </Text>
    </View>
  );
};

/** Cuando no hay nada que enseñar. Una sola manera en toda la app. */
export const PdfEmpty = ({ children }: { children: string }) => (
  <Text
    style={{
      ...text.body,
      color: color.muted,
      fontStyle: 'italic',
      paddingVertical: space.xs + 1,
    }}
  >
    {children}
  </Text>
);
