import React from 'react';
import { styled } from '@mui/system';
import {
  BaseSelectProps,
  FormControl,
  MenuItem,
  OutlinedSelectProps,
  Select,
} from '@mui/material';

type StyledMultiSelectBaseProps = {
  children?: React.ReactNode;
} & BaseSelectProps &
  OutlinedSelectProps;

export const StyledMultiSelectBase = styled(Select)<StyledMultiSelectBaseProps>`
  & .MuiSelect-icon {
    color: var(--black) !important; // change the color of the dropdown icon
  }
  /* Sin alto, ni borde, ni ritmo vertical propios: los pone el bloque
     «EL CAMPO» de global/index.css, igual que a los otros seis tipos de campo
     de la app. Aquí llevaba su propio alto y su propio borde de 1px. */
  display: flex;
  align-items: center;
  gap: 8px;
  .MuiInputBase-input {
    color: var(--black);

    &.MuiSelect-select {
      minheight: 'unset';
      overflow: 'hidden';
      textoverflow: 'ellipsis';
      whitespace: 'nowrap';
      display: 'block';
    }
    & .MuiListItemText-root {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: none;
    }
    & .MuiCheckbox-root {
      display: none;
    }
  }
`;

export const StyledMultiSelect = styled(
  ({ className, ...props }: StyledMultiSelectBaseProps) => (
    <StyledMultiSelectBase
      {...props}
      MenuProps={{ PaperProps: { className } }}
    />
  )
)(({ theme }) => ({
  background: 'var(--white)',
  backgroundColor: 'var(--white)',
  borderRadius: 'var(--radius-l)',
  border: '1px solid var(--accent-200)',
  padding: '8px 0px',
  marginTop: '2px',
  maxHeight: '256px',
  color: 'var(--black)',
  '& ul': { paddingTop: 0, paddingBottom: 0, gap: '5px' },
  '& li': {
    position: 'relative',
    height: '48px',
    '&:hover': {
      backgroundColor: 'var(--accent-100)',
    },
    borderBottom: '1px solid var(--accent-200)',
  },
  '& li:last-child': {
    borderBottom: 'none',
  },
  [theme.breakpoints.down('tablet')]: {
    marginLeft: '-4px',
  },
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '& svg': {
    color: 'var(--accent-350)',
    boxSizing: 'content-box',
  },
  '&.Mui-focused svg': {
    color: 'var(--black)',
  },
}));

/* Sin contornos ni colores de etiqueta propios: los pone el bloque «EL CAMPO»
   de global/index.css. Aquí quedaban DOS juegos de reglas de fieldset —uno en
   objeto y otro en plantilla— para el mismo componente. */
export const StyledFormControl = styled(FormControl)`
  .MuiOutlinedInput-root {
    & svg {
      color: var(--accent-350);
      box-sizing: content-box;
    }
    &.Mui-focused svg {
      color: var(--black);
    }
  }
`;

export const StyledMenuItem = styled(MenuItem)`
  &.Mui-selected {
    background-color: inherit;
  }
  & svg {
    fill: var(--accent-main);
  }
`;
