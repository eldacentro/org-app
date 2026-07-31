import { ReactNode } from 'react';
import { Style } from '@react-pdf/stylesheet';
import { Text, View } from '@react-pdf/renderer';
import { color, radius, space, stroke, text } from './tokens';

/**
 * Las piezas que van dentro de una hoja. Implementa `PDF_DESIGN_SYSTEM.md` §3.
 *
 * Las dos reglas que las gobiernan a todas:
 *
 * - **R4 · La banda de la tarjeta es sagrada.** Lavado + 8,5/700 versalitas en
 *   acento oscuro. Ni tarjetas sin cabecera ni rellenos de azul intenso.
 * - **R5 · El fondo nunca toca la curva.** Todo hijo con fondo lleva su propio
 *   radio (el exterior menos el borde), porque `overflow: hidden` no recorta
 *   fondos en react-pdf.
 */

// ── La tarjeta ────────────────────────────────────────────────────────────

/**
 * LA TARJETA, con su banda. Es la decisión que faltaba: **todas** las tarjetas
 * del sistema llevan banda de lavado, ninguna va sin cabecera y ninguna lleva
 * relleno azul intenso.
 *
 * `wrap={false}` en la cabecera y en el cuerpo por defecto; una tarjeta que no
 * quepa entera se lleva a la hoja siguiente antes que partirse por un sitio
 * cualquiera.
 */
export const PdfCard = ({
  title,
  meta,
  /** El cuadradito de categoría, si la tarjeta pertenece a una. */
  categoryColor,
  /** Sin relleno lateral: para cuando el cuerpo es una tabla. */
  flush = false,
  dense = false,
  children,
  style,
}: {
  title: string;
  meta?: string;
  categoryColor?: string;
  flush?: boolean;
  dense?: boolean;
  children: ReactNode;
  style?: Style;
}) => (
  <View
    wrap={false}
    style={{
      borderRadius: radius.card,
      border: `${stroke.hairline}px solid ${color.border}`,
      backgroundColor: color.white,
      ...style,
    }}
  >
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: dense ? 3.5 : 5,
        paddingHorizontal: 9,
        backgroundColor: color.wash,
        // Radio propio: el de la tarjeta menos el borde. Sin esto asoma el
        // pico blanco por la curva (R5).
        borderTopLeftRadius: radius.inner,
        borderTopRightRadius: radius.inner,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          flex: 1,
        }}
      >
        {categoryColor ? (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 2,
              backgroundColor: categoryColor,
            }}
          />
        ) : null}
        <Text style={text.cardHeader}>{title}</Text>
      </View>
      {meta ? (
        <Text style={{ ...text.meta, fontWeight: 600 }}>{meta}</Text>
      ) : null}
    </View>

    <View
      style={{
        paddingVertical: flush ? 0 : space.md,
        paddingHorizontal: flush ? 0 : 9,
      }}
    >
      {children}
    </View>
  </View>
);

// ── Bloque destacado ──────────────────────────────────────────────────────

/**
 * El «mira esto primero». **Máximo uno por hoja**: si hay dos, ninguno
 * destaca.
 *
 * Sin barras laterales de color: el énfasis es la superficie entera.
 */
export const PdfNote = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: Style;
}) => (
  <View
    wrap={false}
    style={{
      backgroundColor: color.wash,
      border: `${stroke.hairline}px solid ${color.accentLine}`,
      borderRadius: radius.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
      ...style,
    }}
  >
    {children}
  </View>
);

// ── Rótulo / valor ────────────────────────────────────────────────────────

/**
 * Siempre apilado: el rótulo arriba y el valor debajo. Así se alinean en
 * columnas sin necesidad de una tabla.
 */
export const PdfKeyValue = ({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: Style;
}) => (
  <View style={style}>
    <Text style={text.label}>{label}</Text>
    {typeof children === 'string' ? (
      <Text style={{ ...text.body, fontWeight: 500, marginTop: 2 }}>
        {children || '—'}
      </Text>
    ) : (
      <View style={{ marginTop: 2 }}>{children}</View>
    )}
  </View>
);

// ── Etiqueta de estado ────────────────────────────────────────────────────

/**
 * «Sin asignar» es la excepción del sistema: borde discontinuo sobre blanco.
 * No es un estado, es un HUECO — y un hueco no se pinta como si estuviera
 * resuelto.
 */
export const PdfBadge = ({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'empty';
}) => {
  const tonos = {
    neutral: { fg: color.accentDark, bg: color.wash, dashed: false },
    ok: { fg: color.ok, bg: color.okWash, dashed: false },
    warn: { fg: color.warn, bg: color.warnWash, dashed: false },
    danger: { fg: color.danger, bg: color.dangerWash, dashed: false },
    empty: { fg: color.faint, bg: color.white, dashed: true },
  }[tone];

  return (
    <View
      style={{
        backgroundColor: tonos.bg,
        borderRadius: radius.full,
        paddingVertical: 1.5,
        paddingHorizontal: 7,
        ...(tonos.dashed && {
          border: `${stroke.hairline}px dashed ${color.faint}`,
        }),
      }}
    >
      <Text
        style={{
          fontSize: 6.8,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: tonos.fg,
        }}
      >
        {children}
      </Text>
    </View>
  );
};

// ── Categoría con color ───────────────────────────────────────────────────

/** Cuadradito y rótulo del mismo color. Nunca fondos ni bordes de categoría. */
export const PdfCategory = ({
  color: c,
  children,
}: {
  color: string;
  children: string;
}) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    }}
  >
    <View
      style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: c }}
    />
    <Text
      style={{
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: c,
      }}
    >
      {children}
    </Text>
  </View>
);

/**
 * El rombo del responsable —y del precursor—: el único sitio donde el azul de
 * marca aparece dentro del contenido.
 */
export const PdfDiamond = () => (
  <Text style={{ fontSize: 5, color: color.accent }}> ◆</Text>
);

// ── El vacío ──────────────────────────────────────────────────────────────

/**
 * R9 · El vacío se dice. Ninguna celda en blanco: o un guion, o una frase.
 */
export const PdfEmpty = ({
  children,
  inline = false,
}: {
  children?: string;
  /** Dentro de una celda: solo un guion centrado. */
  inline?: boolean;
}) =>
  inline ? (
    <Text
      style={{
        fontSize: 8.5,
        fontStyle: 'italic',
        color: color.faint,
        textAlign: 'center',
      }}
    >
      —
    </Text>
  ) : (
    <Text
      style={{
        fontSize: 8.5,
        fontWeight: 400,
        fontStyle: 'italic',
        color: color.faint,
        textAlign: 'center',
        paddingVertical: space.md,
      }}
    >
      {children}
    </Text>
  );

/** Una línea interior. A ≥9 pt del canto, nunca contra él (R7). */
export const PdfHairline = ({ style }: { style?: Style }) => (
  <View
    style={{
      height: stroke.hairline,
      backgroundColor: color.hairline,
      ...style,
    }}
  />
);
