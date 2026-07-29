import { MouseEvent, forwardRef } from 'react';
import {
  Autocomplete as MUIAutocomplete,
  Box,
  BoxProps,
  Paper,
} from '@mui/material';
import { AutocompletePropsType, CustomPaperType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import Divider from '@components/divider';
import TextField from '@components/textfield';
import Typography from '@components/typography';

export const CustomPaper = ({
  optionsHeader,
  ...otherProps
}: CustomPaperType) => {
  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <Paper
      {...otherProps}
      elevation={1}
      sx={{
        backgroundColor: 'var(--white)',
        borderRadius: 'var(--shape-sm)',
        border: '1px solid var(--accent-200)',
      }}
      className="small-card-shadow"
      onMouseDown={handleMouseDown}
    >
      {optionsHeader && (
        <>
          <Box sx={{ padding: '8px 12px 8px 16px' }}>{optionsHeader}</Box>
          <Divider color="var(--accent-200)" />
        </>
      )}
      {otherProps.children}
    </Paper>
  );
};

export const CustomListBoxComponent = forwardRef((props: BoxProps, ref) => {
  return (
    <Box
      ref={ref}
      {...props}
      sx={{
        padding: '8px 0px',
        '& .MuiAutocomplete-option': {
          padding: '8px 12px 8px 16px !important',
          minHeight: '36px !important',
          backgroundColor: 'unset',
          borderBottom: '1px solid var(--accent-200)',
          '&:hover': {
            backgroundColor: 'var(--accent-150)',
            '& p': {
              color: 'var(--accent-dark)',
            },
          },
        },
        '& .MuiAutocomplete-option:last-child': {
          borderBottom: 'none',
        },
      }}
    />
  );
});

CustomListBoxComponent.displayName = 'CustomListBoxComponent';

const Autocomplete = <T,>(props: AutocompletePropsType<T>) => {
  const { t } = useAppTranslation();

  const {
    startIcon,
    endIcon,
    label,
    optionsHeader,
    styleIcon,
    decorator,
    variant,
    multiline,
    ...defaultProps
  } = props;

  return (
    <MUIAutocomplete
      {...defaultProps}
      fullWidth={true}
      sx={{
        '.MuiOutlinedInput-root': {
          // Sin margen arriba y abajo la caja mide exactamente lo que la línea
          // de texto. En un campo de una línea da igual (la altura la fija
          // `height`), pero en uno multilínea la caja se quedaba en 23px: la
          // etiqueta del campo vacío caía FUERA, cruzada por el borde y encima
          // del campo siguiente. Este era el origen de que un selector vacío
          // se viera roto.
          padding: multiline ? '12px 14px' : '0px 14px',
        },
        '.MuiInputBase-adornedEnd': {
          paddingRight: '14px !important',
        },
        '.MuiAutocomplete-input': {
          padding: '0px !important',
        },
        ...props.sx,
      }}
      PaperComponent={(paperProps) => (
        <CustomPaper {...paperProps} optionsHeader={optionsHeader} />
      )}
      slotProps={{
        listbox: {
          component: CustomListBoxComponent,
        },
      }}
      noOptionsText={
        props.noOptionsText || (
          <Box sx={{ backgroundColor: 'var(--white)' }}>
            <Typography className="body-regular" color="var(--grey-350)">
              {t('tr_noOptions')}
            </Typography>
          </Box>
        )
      }
      loadingText={
        <Box sx={{ backgroundColor: 'var(--white)' }}>
          <Typography className="body-regular">{t('tr_loading')}</Typography>
        </Box>
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant={variant || 'outlined'}
          label={label}
          slotProps={{ input: params.InputProps }}
          startIcon={startIcon}
          endIcon={endIcon}
          multiline={multiline}
          // Con varias líneas la altura la manda el contenido; fijarla en 48
          // dejaría la segunda línea fuera del recuadro.
          height={multiline ? undefined : 48}
          styleIcon={styleIcon ?? true}
          sx={
            decorator
              ? {
                  '.MuiOutlinedInput-root': {
                    borderRadius: 'var(--shape-sm)',
                    '& fieldset': {
                      border: '1px solid var(--orange-dark)',
                    },
                    '&:hover fieldset': {
                      border: '1px solid var(--orange-dark)',
                    },
                    '&.Mui-focused fieldset': {
                      border: '1px solid var(--orange-dark)',
                    },
                  },
                  '.MuiInputLabel-root': {
                    color: 'var(--orange-dark)',
                    '&.Mui-focused': {
                      color: 'var(--orange-dark)',
                    },
                  },
                }
              : {}
          }
        />
      )}
    />
  );
};

export default Autocomplete;
