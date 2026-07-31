import { Box, Card, CardContent, IconButton } from '@mui/material';
import { styled } from '@mui/system';

export const StyledCardBox = styled(Box)({
  width: '100%',
  height: '100%',
  '.MuiCard-root': {
    borderRadius: 'var(--shape-sm)',
    boxShadow: 'none',
    height: '100%',
    border: '1px solid var(--accent-300)',
    '&:hover': {
      background: 'var(--accent-100)',
      border: '1px solid var(--accent-350)',
      boxShadow: '0px 2px 8px 0px rgba(28, 28, 28, 0.12)',
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
    width: '24px',
    height: '24px',
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
