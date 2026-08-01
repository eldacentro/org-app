import { Style } from '@react-pdf/types';
import { color, radius, size, space, stroke } from '@views/design';

/**
 * Los estilos del programa de entre semana. **Todos los valores salen del
 * sistema** (`@views/design`): aquí no se escribe ni un color ni un tamaño a
 * mano.
 *
 * Este documento conserva su propio árbol de componentes —y no usa `PdfCard` ni
 * `PdfTable`— porque es el único preparado para los idiomas que se leen de
 * derecha a izquierda: `applyRTL` voltea cada estilo antes de aplicarlo. Lo que
 * cambió es la ROPA, no el esqueleto.
 */
const styles: Record<string, Style> = {
  // ── La tarjeta de una semana ───────────────────────────────────────────
  weekContainer: {
    marginBottom: space.lg,
    border: `${stroke.hairline} solid ${color.border}`,
    borderRadius: radius.card,
    display: 'flex',
    flexDirection: 'column',
  },
  weekHeader: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: color.wash,
    // Radio propio: el de la tarjeta menos el borde (R5).
    borderTopLeftRadius: radius.inner,
    borderTopRightRadius: radius.inner,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  weekDateContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekDate: {
    color: color.accentDark,
    fontWeight: 700,
    fontSize: size.cardHeader,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  weekMeta: {
    color: color.secondary,
    fontWeight: 600,
    fontSize: size.meta,
    textAlign: 'right',
  },
  coWeekTypeContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.white,
    borderRadius: radius.full,
    gap: 4,
    paddingVertical: 1.5,
    paddingHorizontal: 7,
  },
  coWeekType: {
    color: color.accentDark,
    fontSize: size.badge,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Una parte ──────────────────────────────────────────────────────────
  rowContainer: {
    display: 'flex',
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: 2.5,
    paddingHorizontal: 9,
  },
  timeContainer: {
    width: 27,
    display: 'flex',
  },
  timeText: {
    fontSize: size.meta,
    fontWeight: 700,
    color: color.faint,
    textAlign: 'left',
  },
  sourceContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  sourceTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    flexWrap: 'wrap',
  },
  sourceText: {
    fontSize: size.body,
    color: color.ink,
    textAlign: 'left',
  },
  sourceDurationText: {
    fontSize: size.meta,
    color: color.faint,
    textAlign: 'left',
  },
  sourceSecondary: {
    fontSize: size.meta,
    color: color.secondary,
    textAlign: 'right',
    direction: 'ltr',
  },
  personContainer: {
    width: 132,
    display: 'flex',
    gap: 4,
  },
  personPrimary: {
    fontSize: size.body,
    fontWeight: 600,
    color: color.ink,
    textAlign: 'left',
  },
  personSecondary: {
    fontSize: size.body,
    color: color.secondary,
    textAlign: 'left',
  },
  songContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 2,
    alignItems: 'baseline',
  },
  songText: {
    fontSize: size.body,
    fontWeight: 600,
    color: color.ink,
  },

  // ── El separador de sección ────────────────────────────────────────────
  //
  // No es una barra de color con texto blanco, sino un cuadradito del color de
  // la sección, su rótulo del mismo color y un hairline hasta el margen: el
  // color CLASIFICA, no viste.
  sectionContainer: {
    paddingTop: space.sm,
    paddingBottom: 2,
    paddingHorizontal: 9,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sectionTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sectionSquare: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  sectionTitleText: {
    fontWeight: 700,
    fontSize: size.category,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  sectionRule: {
    flexGrow: 1,
    height: stroke.hairline,
    backgroundColor: color.hairline,
  },
  sectionHallContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.md,
  },
  // Mismo ancho que `personContainer`: así el rótulo de cada sala cae justo
  // encima de la columna de nombres a la que pertenece.
  hallContainer: {
    width: 132,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 3,
  },
  hallName: {
    fontSize: size.label,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: color.faint,
    textAlign: 'left',
  },
  hallCounselor: {
    fontSize: size.meta,
    fontWeight: 600,
    color: color.ink,
    textAlign: 'left',
  },
  hallGroup: {
    fontSize: size.meta,
    color: color.secondary,
    textAlign: 'left',
  },
  weekInfoLabel: {
    fontWeight: 700,
    color: color.ink,
    fontSize: size.heading,
    width: '100%',
    textAlign: 'left',
  },
};

export default styles;
