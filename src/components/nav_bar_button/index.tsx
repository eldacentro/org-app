import useBreakpoints from '@hooks/useBreakpoints';
import { NavBarButtonProps } from './index.types';
import Button from '@components/button';
import { Box } from '@mui/material';

/**
 * NavBarButton component
 *
 * Renders a navigation bar button that adapts its appearance
 * based on screen size and props.
 *
 * - On desktop screens (≥ 688px), or when `textImportant` is true,
 *   it renders a full-sized button with text via the Button component.
 * - On smaller screens, it renders a premium pill with icon + label.
 */
const NavBarButton = (props: NavBarButtonProps) => {
  const { tablet688Up } = useBreakpoints();

  const main = props.main || false;
  const textImportant = props.textImportant || false;
  const disabled = props.disabled || false;

  // ── Desktop / textImportant path ─────────────────────────────────
  if (tablet688Up || textImportant) {
    return (
      <Button
        variant={main ? 'main' : 'secondary'}
        color={props.color}
        ariaLabel={props.text}
        onClick={props.onClick}
        startIcon={props.icon}
        disabled={disabled}
      >
        <Box
          component="span"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {props.text}
        </Box>
      </Button>
    );
  }

  // ── Mobile pill path ─────────────────────────────────────────────
  if (disabled) return null;

  // El `main` va sobre relleno de marca, así que su tinta es la emparejada con
  // ese relleno y no un blanco fijo: en naranja claro el blanco daba 2,29:1.
  // Los que NO son `main` van sobre la bandeja clara y usan la marca como
  // TEXTO: ahí toca `--accent-dark`, que es el tono pensado para leerse; el
  // `--accent-main` está pensado para rellenar y como letra se queda corto
  // (2,31:1 en naranja claro).
  const iconColor = main
    ? 'var(--on-brand)'
    : props.color
      ? `var(--${props.color}-main)`
      : 'var(--accent-dark)';

  return (
    // Dos cosas iban mal aquí, y las dos se ven en la misma línea de código.
    //
    // 1) La clase se llama `nav-action-pill` y el radio era `--shape-sm` (12px):
    //    no era una píldora. Dentro de la bandeja —que SÍ lo es— quedaban unas
    //    esquinas medio cuadradas abrazadas por una curva completa. Es el botón
    //    de acción de TODAS las pantallas en móvil, así que se veía en todas.
    //
    // 2) `role="button"` SIN `tabIndex`: se anunciaba como botón a un lector de
    //    pantalla y no se podía enfocar ni pulsar con el teclado. Eso es peor
    //    que un `div` a secas, porque promete algo que no cumple. Siendo un
    //    <button> de verdad, el foco y el Intro/Espacio vienen de fábrica.
    <Box
      component="button"
      type="button"
      aria-label={props.text}
      className={main ? 'nav-action-pill-main' : 'nav-action-pill'}
      onClick={props.onClick}
      sx={{
        appearance: 'none',
        font: 'inherit',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        px: '12px',
        height: '36px',
        borderRadius: 'var(--shape-full)',
        cursor: 'pointer',
        flexShrink: 0,
        userSelect: 'none',
        // El área del dedo. Este es EL botón de acción de todas las pantallas
        // en móvil y se dibuja a 36 de alto; Material pide 48 de objetivo.
        // Se gana con un `::after` invisible para no tocar el alto, que es lo
        // que le da a la bandeja flotante su proporción.
        //
        // Solo a lo alto: en la bandeja van dos en fila separados por 4px
        // —«Importar/exportar» y «Añadir»—, así que ensanchar el área haría
        // que se pisaran. Y con `max(100%, 48px)` en vez de un desplazamiento
        // fijo, porque la píldora no siempre mide exactamente 36.
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          height: 'max(100%, 48px)',
        },
        WebkitTapHighlightColor: 'transparent',
        transition:
          'transform var(--motion-fast) var(--ease-emphasized), opacity var(--motion-fast) var(--ease-standard)',
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '2px',
        },
        '&:active': {
          transform: 'scale(0.93)',
          opacity: 0.85,
        },
        '& svg': {
          width: '18px',
          height: '18px',
          flexShrink: 0,
        },
        '& svg, & svg g, & svg g path': {
          fill: iconColor,
        },
      }}
    >
      {props.icon}
      <Box
        component="span"
        className="body-small-semibold"
        sx={{
          color: iconColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '120px',
          lineHeight: 1,
        }}
      >
        {props.text}
      </Box>
    </Box>
  );
};

export default NavBarButton;
