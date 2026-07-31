import { ReactNode } from 'react';
import { Page as PdfPage, Text, View } from '@react-pdf/renderer';
import { IconLogo } from '@views/components/icons';
import { color, page, space, stroke, text } from './tokens';

/**
 * LA HOJA del sistema: márgenes, cabecera y pie.
 *
 * ── La anatomía ──────────────────────────────────────────────────────────
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ [logo] Congregación            julio de 2026 │  barra de marca
 *   │ ──────────────────────────────────────────── │  regla
 *   │                                              │
 *   │ Título de la hoja                            │  display
 *   │ De qué va                                    │  subtitle
 *   │                                              │
 *   │ …secciones…                                  │
 *   │                                              │
 *   │ ──────────────────────────────────────────── │
 *   │ Congregación            Página 1 de 2        │  pie (fijo)
 *   └──────────────────────────────────────────────┘
 *
 * Siempre la misma, en las once hojas que diseña la app. Lo que cambia de un
 * documento a otro es lo de en medio — que para eso están las secciones, las
 * tablas, las tarjetas y la cuadrícula.
 *
 * El pie va en posición absoluta y se repite en todas las páginas; por eso la
 * hoja le reserva su alto por abajo, para que el contenido no se le eche
 * encima.
 */

const Sheet = ({
  congregation,
  meta,
  title,
  subtitle,
  landscape = false,
  paginated = false,
  footerMeta,
  children,
}: {
  congregation: string;
  /** A la derecha de la barra: el mes, el rango de semanas… */
  meta?: string;
  title: string;
  subtitle?: string;
  landscape?: boolean;
  /** El pie enseña "Página 1 de 2" cuando hay más de una hoja. */
  paginated?: boolean;
  /** Lo que va abajo a la derecha cuando no hay paginación. */
  footerMeta?: string;
  children: ReactNode;
}) => {
  const margin = landscape ? page.marginLandscape : page.margin;
  const nombre = congregation || 'Elda Centro';

  return (
    <PdfPage
      size="A4"
      orientation={landscape ? 'landscape' : 'portrait'}
      style={{
        paddingTop: margin,
        paddingHorizontal: margin,
        paddingBottom: margin + page.footerSpace,
        fontFamily: 'Figtree',
        backgroundColor: color.white,
      }}
    >
      {/* ── Barra de marca ─────────────────────────────────────────── */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: space.sm,
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md - 1,
          }}
        >
          <IconLogo size={22} />
          <Text style={{ fontSize: 12.5, fontWeight: 700, color: color.ink }}>
            {nombre}
          </Text>
        </View>
        {meta ? <Text style={text.meta}>{meta}</Text> : null}
      </View>

      <View
        style={{
          borderBottom: `${stroke.thin}px solid ${color.accentLine}`,
          marginBottom: space.lg - 1,
        }}
      />

      {/* ── Título ─────────────────────────────────────────────────── */}
      <View style={{ marginBottom: space.xl }}>
        <Text style={text.display}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...text.subtitle, marginTop: space.xs - 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {children}

      {/* ── Pie ────────────────────────────────────────────────────── */}
      <View
        fixed
        style={{
          position: 'absolute',
          bottom: margin - space.lg,
          left: margin,
          right: margin,
          borderTop: `${stroke.hair}px solid ${color.line}`,
          paddingTop: space.sm,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={text.footnote}>{nombre}</Text>
        {paginated ? (
          <Text
            fixed
            style={text.footnote}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1
                ? `Página ${pageNumber} de ${totalPages}`
                : (footerMeta ?? '')
            }
          />
        ) : footerMeta ? (
          <Text style={text.footnote}>{footerMeta}</Text>
        ) : null}
      </View>
    </PdfPage>
  );
};

export default Sheet;
