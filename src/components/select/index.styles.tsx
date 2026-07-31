import { Select, styled } from '@mui/material';

export const SelectStyled = styled(Select)({
  '.MuiSelect-select p': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  // Sin alto ni paddings propios: los pone el bloque «EL CAMPO» de
  // `global/index.css`, igual que a las otras tres familias de campo.
  '.MuiSelect-select': {
    color: 'var(--black)',
    display: 'flex',
    alignItems: 'center',
  },
  // La flecha se centra de verdad, no "casi".
  //
  // MUI la coloca con `top: calc(50% - .5em)`, y ese `em` es el TAMAÑO DE
  // LETRA del icono —24 por defecto en un MuiSvgIcon—, no su altura real, que
  // aquí son 20 porque se la pasamos a mano. Con la caja en 56 salía en el 16
  // y terminaba en el 36: 16 de aire arriba y 20 abajo. Dos píxeles, pero
  // siempre para el mismo lado y en todos los selectores de la app.
  //
  // Con `50%` + `translateY(-50%)` el centrado no depende del tamaño de letra.
  // El giro de abrirse se redeclara porque comparte propiedad con el
  // desplazamiento: si solo dejáramos el `rotate` de MUI, al abrirse perdería
  // el centrado y pegaría un salto.
  '.MuiSelect-icon': {
    color: 'var(--black)',
    top: '50%',
    transform: 'translateY(-50%)',
    '&.MuiSelect-iconOpen': {
      transform: 'translateY(-50%) rotate(180deg)',
    },
    '&.Mui-disabled': {
      color: 'var(--accent-200)',
    },
  },
}) as unknown as typeof Select;
