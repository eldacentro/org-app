import { Box, Card, CardContent, IconButton } from '@mui/material';
import { styled } from '@mui/system';

export const StyledCardBox = styled(Box)({
  width: '100%',
  height: '100%',
  '.MuiCard-root': {
    borderRadius: 'var(--shape-sm)',
    boxShadow: 'none',
    height: '100%',
    // El borde suave de cualquier tarjeta de la app, no uno propio.
    // Llevaba `--accent-300`, bastante más marcado, así que la misma persona
    // se veía con un canto verde en Personas y con el canto de siempre en
    // Informes de predicación. Es la misma ficha en dos listas.
    border: '1px solid var(--line)',
    '&:hover': {
      background: 'var(--accent-100)',
      border: '1px solid var(--accent-350)',
      boxShadow: 'var(--shadow-sm)',
      cursor: 'pointer',
    },
  },
});

export const StyledCard = styled(Card)({
  background: 'var(--white)',
});

export const StyledCardContent = styled(CardContent)({
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const StyledIconWrapper = styled(IconButton, {
  shouldForwardProp: (prop) =>
    !['hoverBackgrColor', 'iconColor'].includes(String(prop)),
})<{ hoverBackgrColor: string; iconColor: string }>(
  ({ hoverBackgrColor, iconColor }) => ({
    // Por encima de la capa que abre la ficha. Sin esto, el botón de borrar
    // quedaría DEBAJO de ella y pulsarlo abriría la persona en vez de
    // borrarla — que es exactamente el error que no se puede permitir.
    position: 'relative',
    '& svg:hover': {
      background: hoverBackgrColor,
      borderRadius: 'var(--shape-md)',
      cursor: 'pointer',
    },
    '& svg g, & svg g path': {
      fill: iconColor,
    },
    // 48×48 DE VERDAD, con el icono de 24 centrado dentro.
    //
    // Era el peor objetivo táctil de la app: una acción DESTRUCTIVA de 24×24
    // —la mitad del mínimo de Material— repetida cien veces en una lista que
    // se recorre con el pulgar.
    //
    // Aquí NO vale el truco del `::after` invisible que usa el resto de la
    // app, y se comprobó a base de intentarlo: `StyledBoxSpaceBetween`, unas
    // líneas más abajo, lleva `overflow: hidden` para recortar los nombres
    // largos, y eso recorta también el pseudoelemento. Con
    // `elementFromPoint`: el área MEDÍA 48×48, pero por arriba y por abajo
    // seguía respondiendo la ficha de la persona. Un objetivo táctil que solo
    // existe en la hoja de estilos no sirve de nada.
    //
    // Así que este ocupa sitio de verdad. Son 24px de ancho que se le quitan
    // a la columna del nombre, que va holgada.
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  })
);

export const StyledBoxSpaceBetween = styled(Box)<{
  flexDirection: 'row' | 'column';
}>(({ flexDirection }) => ({
  display: 'flex',
  width: '100%',
  overflow: 'hidden',
  flexDirection: flexDirection,
  justifyContent: 'space-between',
}));

export const StyledBox = styled(Box)<{
  flexDirection?: 'row' | 'column';
  gap?: string;
}>(({ flexDirection = 'row', gap }) => ({
  display: 'flex',
  flexDirection: flexDirection,
  gap: gap || '0px',
}));

export const StyledImgContainer = styled(Box)({
  width: '48px',
  height: '48px',
});
