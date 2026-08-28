import { Box, SxProps, Theme } from '@mui/material';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Typography from '@components/typography';
import Badge from '@components/badge';
import { IconHousehold } from '@components/icons';
import accentSurface from '@components/accent_surface';
import { displayText } from '@services/app/territories';

/**
 * Vocabulario visual compartido de Territorios.
 *
 * El módulo se escribió pantalla a pantalla y cada una se inventó sus propias
 * piezas: había once tarjetas distintas (cuatro grosores de "uñita", radios de
 * 10, 12, 14, 20, 24 y 28px) y ocho maneras de pintar una etiqueta de estado,
 * cada una con su `fontSize` y su `fontWeight` a pelo. Aquí viven las dos
 * únicas versiones buenas; todo lo demás las usa.
 *
 * Las etiquetas de SIGNIFICADO FIJO (Atrasado, Campaña, No visitar…) no están
 * aquí a propósito: esas son el componente `Badge` compartido de la app, el
 * mismo que usan Personas o Informes. Aquí solo está lo que Territorios sí
 * tiene de propio — el color que elige un responsable para una zona o una
 * etiqueta, que no puede salir de la paleta de tokens porque es un dato.
 */

// ─── La tarjeta ───────────────────────────────────────────────────────────

type TerritoryCardProps = {
  children: ReactNode;
  /**
   * Color de la zona (o de lo que categorice la fila). Pinta la cápsula
   * lateral y el lavado de fondo. Sin él, la tarjeta es lisa.
   */
  accent?: string;
  /** Atenúa la tarjeta (p. ej. territorios de otro publicador). */
  muted?: boolean;
  sx?: SxProps<Theme>;
};

/**
 * LA tarjeta de una fila de territorio. Un solo radio (`--shape-lg`, el de
 * cualquier tarjeta de página en el resto de la app — las de aquí estaban a
 * 16px y cantaban), un solo hueco interior, y NADA de hover: estas tarjetas
 * no se pulsan, se pulsan los botones de dentro. Antes se levantaban 2px y
 * cambiaban de sombra al pasar el ratón, prometiendo un clic que no existía.
 */
export const TerritoryCard = ({
  children,
  accent,
  muted,
  sx,
}: TerritoryCardProps) => {
  const style = {
    padding: '16px',
    borderRadius: 'var(--shape-lg)',
    border: '1px solid var(--line)',
    backgroundColor: 'var(--card)',
    boxShadow: 'var(--small-card-shadow)',
    ...(accent ? (accentSurface(accent) as object) : {}),
    ...(muted && { borderStyle: 'dashed' }),
    ...(sx as object),
  } as SxProps<Theme>;

  return <Box sx={style}>{children}</Box>;
};

// ─── La etiqueta de color libre ───────────────────────────────────────────

type TagChipProps = {
  label: string;
  /** HEX elegido por un responsable — por eso no puede ser un token. */
  color: string;
  /** Marcada: se rellena del color en vez de solo teñirse. */
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  /**
   * La parte de un territorio ya está hecha: se apaga y se tacha.
   *
   * Es una marca personal de quien lleva el territorio, no un registro — ver
   * `TerritorySection.hecha`.
   */
  hecha?: boolean;
  /**
   * Apostilla en gris detrás del nombre — "anteayer", "hace 5 días".
   *
   * No se tacha aunque la píldora esté hecha: lo tachado es el nombre, que es
   * lo que ya está resuelto; la fecha es información que se viene a leer.
   */
  detalle?: string;
  /**
   * `medium` para las píldoras que se TOCAN (las partes de un territorio
   * dividido): más alto, más ancho y con la letra un punto mayor.
   *
   * La de reposo es una etiqueta que se lee, y de esas hay cuatro en una
   * ficha de dos dedos, así que es pequeña a propósito. Pero cuando la
   * píldora es el botón —y encima el nombre suele ser una sola letra— ese
   * tamaño deja un blanco demasiado fino para un pulgar.
   */
  size?: 'small' | 'medium';
};

/**
 * Etiqueta con color de dato (etiquetas de territorio, nombres de zona).
 *
 * **En reposo la píldora es NEUTRA y el color va en un punto.** Antes la
 * píldora entera se teñía del color de la etiqueta, y en la cuadrícula de
 * Territorios eso amontonaba cuatro señales de color en una tarjeta de dos
 * dedos: el lavado de la zona al fondo, su cápsula al lado, la etiqueta de
 * estado ("Libre" en verde) y encima una o dos etiquetas más, también en
 * pastel. Todas se parecían y ninguna destacaba — y la de estado y la de
 * etiqueta, que dicen cosas distintas, se leían como el mismo objeto.
 *
 * Con la píldora neutra:
 *  - El color sigue estando, en el punto, que es donde se distingue de un
 *    vistazo sin competir con nada (§6.4 se cumple igual: el color viene del
 *    dato, no de la paleta de tokens).
 *  - El nombre se lee en tinta normal, que es a lo que se viene.
 *  - La única píldora de color de la tarjeta vuelve a ser la de ESTADO.
 *  - Y al no mezclarse con el fondo, da igual sobre qué superficie caiga:
 *    tarjeta teñida, fila en descanso o ficha del mapa.
 *
 * Marcada (el rail de filtros) usa el ÚNICO dibujo de "elegido" que tiene la
 * app —píldora tintada de marca con el texto en azul oscuro, §2.5—, el mismo
 * que las fichas de estado que van justo encima. Antes se rellenaba del color
 * de la etiqueta, y eso traía dos problemas: la fila de estados y la de
 * etiquetas marcaban lo elegido de dos maneras distintas, y con un color claro
 * (el ámbar de "Grande") el texto blanco encima no se leía. El punto sigue
 * diciendo de qué etiqueta se trata.
 */
/**
 * El bloque de texto de una fila que ABRE el territorio.
 *
 * Las filas de Campañas y Estadísticas llevan sus propios botones a la
 * derecha ("Asignar", "Entregar", "Quitar"), así que la fila entera no puede
 * ser un botón: se anidarían. Pero el nombre del territorio SÍ tiene que
 * poder pulsarse — era el único sitio del panel donde un territorio no se
 * podía abrir para verlo. Esto es un `button` de verdad (teclado y lector de
 * pantalla incluidos) que no se ve como tal: el texto queda igual que antes.
 */
export const AbrirTerritorio = ({
  label,
  onClick,
  children,
}: {
  /** Nombre legible del territorio, para el lector de pantalla. */
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Box
    component="button"
    type="button"
    aria-label={`Ver ${label}`}
    onClick={onClick}
    className="active-press"
    sx={{
      appearance: 'none',
      font: 'inherit',
      background: 'none',
      border: 'none',
      padding: 0,
      margin: 0,
      textAlign: 'left',
      cursor: 'pointer',
      minWidth: 0,
      flex: 1,
      // En móvil estas filas son columnas: sin esto, el área que se pulsa
      // acababa siendo solo el ancho del texto.
      width: '100%',
      '&:focus-visible': {
        outline: '2px solid var(--accent-main)',
        outlineOffset: '3px',
        borderRadius: 'var(--shape-xs)',
      },
    }}
  >
    {children}
  </Box>
);

export const TagChip = ({
  label,
  color,
  selected,
  onClick,
  title,
  hecha,
  detalle,
  size = 'small',
}: TagChipProps) => (
  <Box
    component={onClick ? 'button' : 'div'}
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    aria-pressed={onClick ? Boolean(selected) : undefined}
    title={title}
    sx={{
      // Reset de <button>: sin esto hereda el tipo del navegador.
      appearance: 'none',
      font: 'inherit',
      margin: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: size === 'medium' ? '8px' : '6px',
      padding: size === 'medium' ? '7px 14px' : '2px 10px',
      minHeight: size === 'medium' ? '36px' : '22px',
      borderRadius: 'var(--shape-full)',
      flexShrink: 0,
      // `--grey-100` y no `--surface-2`: ese token es un azul bastante subido
      // (208,220,238) y le ganaba en peso al propio tinte de "elegido"
      // (224,232,245), así que las etiquetas sin marcar se veían MÁS rellenas
      // que la marcada. Este es el mismo gris del buscador de al lado.
      backgroundColor: selected ? 'var(--state-selected)' : 'var(--grey-100)',
      border: `1px solid ${selected ? 'var(--state-selected)' : 'var(--line)'}`,
      color: selected ? 'var(--state-selected-ink)' : 'var(--ink)',
      // Hecha: se apaga y se tacha. Apagar SOLO con opacidad bajaría el texto
      // del contraste mínimo, así que el color va a `--ink-3`, que es un gris
      // legible, y el punto de color se queda hueco.
      ...(hecha && {
        color: 'var(--ink-3)',
        backgroundColor: 'transparent',
      }),
      cursor: onClick ? 'pointer' : 'default',
      transition: onClick
        ? 'background-color var(--motion-fast) var(--ease-standard)'
        : 'none',
      ...(onClick && {
        '&:hover': {
          backgroundColor: selected
            ? 'var(--state-selected-strong)'
            : 'var(--state-hover)',
        },
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '2px',
        },
      }),
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: size === 'medium' ? 10 : 8,
        height: size === 'medium' ? 10 : 8,
        borderRadius: 'var(--shape-full)',
        backgroundColor: hecha ? 'transparent' : color,
        border: hecha ? `1.5px solid ${color}` : undefined,
        flexShrink: 0,
      }}
    />
    <Typography
      component="span"
      className={
        size === 'medium' ? 'body-regular-semibold' : 'body-small-semibold'
      }
      color="inherit"
      sx={{
        lineHeight: '18px',
        ...(hecha && { textDecoration: 'line-through' }),
      }}
    >
      {label}
    </Typography>
    {detalle && (
      <Typography
        component="span"
        className={
          size === 'medium' ? 'body-small-regular' : 'label-small-regular'
        }
        color="var(--ink-3)"
        sx={{ lineHeight: '18px' }}
      >
        {detalle}
      </Typography>
    )}
  </Box>
);

// ─── El estado de un territorio ───────────────────────────────────────────

export type EstadoTerritorio = 'asignado' | 'descanso' | 'libre';

const ESTADO_TEXTO: Record<EstadoTerritorio, string> = {
  asignado: 'Asignado',
  descanso: 'En descanso',
  libre: 'Libre',
};

const ESTADO_COLOR: Record<EstadoTerritorio, 'orange' | 'grey' | 'green'> = {
  asignado: 'orange',
  descanso: 'grey',
  libre: 'green',
};

/**
 * "Asignado" / "Libre" / "En descanso". Estaba escrito cuatro veces, cada una
 * con su `fontSize: 0.75rem` y su borde a base de `rgba(...)`, y en dos de
 * ellas los colores no coincidían entre sí.
 *
 * En descanso lleva además cuánto lleva: «En descanso · 20 d». "Descansando"
 * a secas no dice si le queda mucho o si está a punto, que es justo lo que se
 * pregunta quien va a repartir. La cuenta sale de `daysInCooldown`, o sea de
 * la fecha en que se devolvió trabajado — ver allí por qué no vale `updatedAt`.
 *
 * El día va abreviado ("20 d") a propósito: la píldora vive en la esquina de
 * una ficha que en un móvil mide media pantalla, y con "20 días" no cabe.
 */
export const EstadoBadge = ({
  estado,
  dias,
}: {
  estado: EstadoTerritorio;
  /** Días que lleva en descanso. Solo se usa con `estado: 'descanso'`. */
  dias?: number | null;
}) => (
  <Badge
    size="small"
    color={ESTADO_COLOR[estado]}
    text={
      estado === 'descanso' && typeof dias === 'number'
        ? `${ESTADO_TEXTO[estado]} · ${dias} d`
        : ESTADO_TEXTO[estado]
    }
  />
);

/** El estado de un territorio a partir de los dos datos que lo deciden. */
export const estadoDeTerritorio = (
  asignado: boolean,
  enDescanso: boolean
): EstadoTerritorio =>
  asignado ? 'asignado' : enDescanso ? 'descanso' : 'libre';

// ─── El par etiqueta / valor ──────────────────────────────────────────────

/**
 * Un dato con su rótulo. Las fechas ("Asignado", "Vence") iban sueltas como
 * `Asignado: 10-07-2026` en una línea de texto corrido: el rótulo pesaba lo
 * mismo que el dato y no se podía barrer la lista con la vista. Es el mismo
 * par que ya se usa en Responsabilidades.
 */
export const MetaItem = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger';
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
    <Typography className="label-small-semibold" color="var(--ink-3)">
      {label}
    </Typography>
    <Typography
      className="body-small-regular"
      color={tone === 'danger' ? 'var(--red-main)' : 'var(--ink)'}
    >
      {value}
    </Typography>
  </Box>
);

// ─── Tag de número de viviendas ───────────────────────────────────────────
// El `Badge` compartido, no una caja propia: la de antes traía su
// `fontSize: 12px` y su `fontWeight: 600` a pelo, así que al lado de
// cualquier otra etiqueta de la app cantaba.
//
// Vive aquí, con `TagChip`, porque lo usan las DOS vistas del territorio: la
// de dentro de la app y la del enlace público. Estaba suelto en la de dentro,
// y el enlace se escribía su propia versión.
export const ViviendasTag = ({ count }: { count: number }) => (
  <Badge
    size="small"
    color="accent"
    icon={<IconHousehold />}
    text={`${count} ${count === 1 ? 'vivienda' : 'viviendas'}`}
  />
);

// ─── La nota de una solicitud ─────────────────────────────────────────────
/**
 * Lo que el hermano escribió al pedir territorio.
 *
 * La nota es el único sitio donde dice lo que realmente quiere ("uno de
 * pisos, que voy con el carrito", "el 12 si está libre, que es el de mi
 * calle"), y aparece en cuatro pantallas distintas: la campanita, las
 * solicitudes pendientes, las ya atendidas y el historial. Se escribía a mano
 * en cada una, con un recorte distinto —o sin ninguno, y una nota larga
 * partía la tarjeta en dos—.
 *
 * Recortada a dos líneas por defecto, con un enlace para leerla entera que
 * SOLO sale si de verdad no cabe: en la inmensa mayoría de las notas, que son
 * de una línea, no aparece nada.
 */
export const NotaPeticion = ({
  nota,
  variant = 'destacada',
  lineas = 2,
}: {
  nota: string;
  /** `destacada` en lo que está esperando respuesta; `discreta` en lo ya
   *  hecho, donde la nota es un dato de consulta y no una petición viva. */
  variant?: 'destacada' | 'discreta';
  lineas?: number;
}) => {
  const [abierta, setAbierta] = useState(false);
  const [desborda, setDesborda] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Solo se mide cerrada: abierta, el alto de dentro y el de fuera coinciden
  // siempre y el enlace para volver a plegarla desaparecería nada más pulsarlo.
  //
  // Se mide el propio párrafo —el primer hijo—, no esta caja: el recorte vive
  // en el texto, y una caja sin recortar crece con él y nunca desbordaría.
  useEffect(() => {
    const el = ref.current?.firstElementChild;
    if (!el || abierta) return;
    setDesborda(el.scrollHeight > el.clientHeight + 1);
  }, [nota, lineas, abierta]);

  const recorte = abierta
    ? {}
    : {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: lineas,
        overflow: 'hidden',
      };

  const destacada = variant === 'destacada';

  return (
    <Box
      ref={ref}
      sx={
        destacada
          ? {
              mt: 1,
              // Se ajusta al texto: como bloque ocupaba los ochocientos
              // píxeles de la columna y una frase de diez palabras quedaba
              // flotando en una franja larguísima.
              display: 'inline-block',
              maxWidth: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--shape-sm)',
              backgroundColor: 'var(--accent-100)',
            }
          : { minWidth: 0 }
      }
    >
      {/* El recorte va en el PÁRRAFO, no en una caja por fuera: envuelto, las
          líneas se separaban con el interlineado de la tarjeta (24px) en vez
          de con el suyo, y la nota quedaba con una calle enorme en medio. */}
      <Typography
        className={destacada ? 'body-small-regular' : 'label-small-regular'}
        color={destacada ? 'var(--ink)' : 'var(--ink-2)'}
        sx={{ fontStyle: 'italic', ...recorte }}
      >
        &laquo;{displayText(nota)}&raquo;
      </Typography>

      {desborda && (
        <Box
          component="button"
          type="button"
          onClick={() => setAbierta((v) => !v)}
          sx={{
            border: 'none',
            background: 'none',
            padding: 0,
            marginTop: '2px',
            cursor: 'pointer',
            color: 'var(--accent-dark)',
            font: 'inherit',
          }}
        >
          <Typography className="label-small-medium" color="var(--accent-dark)">
            {abierta ? 'Menos' : 'Leer la nota entera'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
