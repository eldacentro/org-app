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
  '.MuiSelect-icon': {
    color: 'var(--black)',
    '&.Mui-disabled': {
      color: 'var(--accent-200)',
    },
  },
}) as unknown as typeof Select;
