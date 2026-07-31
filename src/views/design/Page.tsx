import { ReactNode } from 'react';
import { Page as PdfPage, Text, View } from '@react-pdf/renderer';
import { IconLogo } from '@views/components/icons';
import { color, page, radius, space, stroke, text } from './tokens';

/**
 * LA HOJA. Implementa `PDF_DESIGN_SYSTEM.md` §2 — la anatomía que comparten
 * los doce documentos.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ ▣ Elda Centro                 ( AGOSTO 2026 )│  firma + cápsula
 *   │                                              │  +12
 *   │ Programa de exhibidores                      │  título 16/800
 *   │ Exhibidores públicos · turnos de dos horas   │  +3, subtítulo 9,5/500
 *   │ ▬▬▬ ──────────────────────────────────────── │  +10, LA REGLA
 *   │                                              │  +14
 *   │ …contenido…                                  │
 *   │                                              │
 *   │ ──────────────────────────────────────────── │
 *   │ Elda Centro · Documento   Hoja 1 de 2 · …    │  pie fijo
 *   └──────────────────────────────────────────────┘
 *
 * **La regla es la firma del sistema**: el guion azul de 26 × 2,5 seguido del
 * hairline hasta el margen. Es lo único gráfico que comparten las doce hojas y
 * lo que hace que se reconozcan a dos metros en el tablón. No se toca ni
 * siquiera en modo compacto.
 *
 * **La cápsula lleva el PERIODO DE VIGENCIA, no el día** (regla R2): "Agosto
 * 2026", "Agosto – Septiembre 2026", "2026 – 2027". Nunca días sueltos, nunca
 * rangos con día, nunca "Hoja 1 de 2" — la numeración vive en el pie.
 */

/**
 * El wordmark: la última palabra en 800 y el resto en 500.
 *
 * La especificación lo define para "Elda Centro" —«Elda» 500 + «Centro» 800—,
 * pero el nombre de la congregación es un ajuste y puede ser cualquiera. La
 * regla generalizada da ese mismo resultado para el nuestro y algo sensato
 * para cualquier otro; con una sola palabra, va entera en 800.
 */
const Wordmark = ({ nombre }: { nombre: string }) => {
  const palabras = nombre.trim().split(/\s+/);
  const ultima = palabras.pop() ?? '';
  const resto = palabras.join(' ');

  return (
    <Text style={{ fontSize: 10.5, color: color.ink }}>
      {resto ? <Text style={{ fontWeight: 500 }}>{resto} </Text> : null}
      <Text style={{ fontWeight: 800 }}>{ultima}</Text>
    </Text>
  );
};

const Sheet = ({
  congregation,
  period,
  title,
  subtitle,
  documentName,
  updatedAt,
  landscape = false,
  dense = false,
  children,
}: {
  congregation: string;
  /** El periodo de vigencia, ya formateado: "Agosto 2026". */
  period?: string;
  title: string;
  subtitle?: string;
  /** Para el pie: "Elda Centro · Programa de exhibidores". */
  documentName?: string;
  /** Para el pie: "Actualizado el 1 ago 2026". */
  updatedAt?: string;
  landscape?: boolean;
  /** Modo compacto: solo aprieta el contenido, nunca la cabecera ni el pie. */
  dense?: boolean;
  children: ReactNode;
}) => {
  const margin = landscape ? page.marginLandscape : dense ? 30 : page.margin;
  const nombre = congregation || 'Elda Centro';

  return (
    <PdfPage
      size="A4"
      orientation={landscape ? 'landscape' : 'portrait'}
      style={{
        paddingTop: margin,
        paddingHorizontal: margin,
        paddingBottom: margin + 14,
        fontFamily: 'Figtree',
        backgroundColor: color.white,
      }}
    >
      {/* ── ① Firma  ②  Cápsula de fecha ─────────────────────────── */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <IconLogo size={15} />
          <Wordmark nombre={nombre} />
        </View>

        {period ? (
          <View
            style={{
              backgroundColor: color.wash,
              borderRadius: radius.full,
              paddingVertical: 3.5,
              paddingHorizontal: 10,
            }}
          >
            <Text style={text.dateCapsule}>{period}</Text>
          </View>
        ) : null}
      </View>

      {/* ── ③ Título y subtítulo ─────────────────────────────────── */}
      <Text style={{ ...text.sheetTitle, marginTop: 12 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ ...text.sheetSubtitle, marginTop: 3 }}>{subtitle}</Text>
      ) : null}

      {/* ── ④ LA REGLA ───────────────────────────────────────────── */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 10,
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 26,
            height: stroke.dash,
            borderRadius: radius.dash,
            backgroundColor: color.accent,
          }}
        />
        <View
          style={{
            flex: 1,
            height: stroke.hairline,
            backgroundColor: color.hairline,
            marginLeft: 5,
          }}
        />
      </View>

      {children}

      {/* ── ⑤ Pie ────────────────────────────────────────────────── */}
      <View
        fixed
        style={{
          position: 'absolute',
          bottom: margin - space.xl,
          left: margin,
          right: margin,
          borderTop: `${stroke.hairline}px solid ${color.hairline}`,
          paddingTop: 6,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={text.footer}>
          {documentName ? `${nombre} · ${documentName}` : nombre}
        </Text>
        <Text
          fixed
          style={text.footer}
          render={({ pageNumber, totalPages }) =>
            [
              `Hoja ${pageNumber} de ${totalPages}`,
              updatedAt ? `Actualizado el ${updatedAt}` : '',
            ]
              .filter(Boolean)
              .join(' · ')
          }
        />
      </View>
    </PdfPage>
  );
};

export default Sheet;
