import { Children } from 'react';
import { FormControl, FormHelperText, InputLabel, Theme } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { SelectStyled } from './index.styles';
import { SelectPropsType } from './index.types';
import MenuItem from '@components/menuitem';
import { IconExpand } from '@components/icons';
import Typography from '@components/typography';

/**
 * Custom select component.
 *
 * @param props The props for the CustomSelect component.
 * @returns A custom select input field.
 */
const Select = ({ helperText, ...props }: SelectPropsType) => {
  const { t } = useAppTranslation();

  // Cuántas opciones hay de verdad.
  //
  // Antes se preguntaba `(props.children as []).length`, y ese casting a `[]`
  // era mentira dos veces:
  //
  // · Con `undefined` —lo que devuelve una cadena de `?.` que se rompe por en
  //   medio, como el desplegable de ubicación de Exhibidores— leer `.length`
  //   revienta y se lleva por delante la PANTALLA ENTERA, no solo el campo.
  // · Con UNA sola opción, que no llega como array, `.length` vale `undefined`:
  //   ni `=== 0` ni `> 0`, así que no se pintaba ni el "Sin opciones" ni la
  //   opción. El desplegable salía vacío sin que fallara nada.
  //
  // `Children.count` cuenta bien los tres casos —ninguno, uno y varios— y deja
  // el "Sin opciones" que ya estaba escrito haciendo su trabajo.
  const optionsCount = Children.count(props.children);

  return (
    <FormControl
      fullWidth
      size="small"
      sx={props.sx}
      disabled={props.disabled ?? false}
    >
      <InputLabel
        className="body-regular"
        // Con `displayEmpty`, el rótulo TIENE que estar arriba.
        //
        // MUI decide si encogerlo mirando si el campo tiene valor, y un
        // `displayEmpty` enseña una opción para el valor VACÍO —"Todos los
        // informes"—: para MUI sigue vacío, así que dejaba el rótulo dentro,
        // encima del texto. Se veía en el filtro de Informes de predicación,
        // con "Informes" escrito sobre "Todos los informes"; medido, el rótulo
        // caía en el 14 y el valor en el 10, uno sobre otro.
        //
        // Va aquí y no en ese sitio porque le pasa a CUALQUIER desplegable que
        // enseñe su opción vacía, y esa decisión la toma quien lo usa.
        shrink={props.displayEmpty ? true : undefined}
        sx={{
          color: props.error ? 'var(--red-main)' : 'var(--accent-350)',
          '&.Mui-focused': { color: 'var(--accent-main)' },
          '&[data-shrink=false]': {
            transform: 'translate(14px, 12px) scale(1)',
          },
          '&.Mui-disabled': { color: 'var(--accent-200)' },
        }}
      >
        {props.label}
      </InputLabel>
      <SelectStyled
        {...props}
        size="small"
        fullWidth
        // MUI trae su propio TRIÁNGULO para "esto se despliega", y era el único
        // sitio de la app donde aparecía: el resto de la interfaz —el selector
        // de mes, los plegables, las filas de Oradores salientes— usa el
        // chevrón de `@components/icons`. Dos dibujos para la misma idea.
        // MUI le pasa su `className`, así que la vuelta de 180° al abrirse
        // (`.MuiSelect-iconOpen`) sigue funcionando sola.
        IconComponent={(iconProps) => (
          <IconExpand
            {...iconProps}
            color="var(--ink-2)"
            width={20}
            height={20}
          />
        )}
        inputProps={{
          ...props.inputProps,
          MenuProps: {
            PaperProps: {
              sx: (theme: Theme) => ({
                background: 'var(--white)',
                backgroundColor: 'var(--white)',
                borderRadius: 'var(--shape-sm)',
                border: '1px solid var(--accent-200)',
                padding: '8px 0px',
                marginTop: '2px',
                maxHeight: '232px',
                width: !props.children ? '300px !important' : 'auto',
                '& ul': {
                  paddingTop: 0,
                  paddingBottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                },
                '& li': {
                  position: 'relative',
                  boxSizing: 'border-box',
                  borderBottom: '1px solid var(--accent-200)',
                  color: 'var(--black)',
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
              }),
              className: 'small-card-shadow',
            },
          },
        }}
      >
        {optionsCount === 0 && (
          <MenuItem value="">
            <Typography className="body-small-regular" color="var(--grey-350)">
              {t('tr_noOptions')}
            </Typography>
          </MenuItem>
        )}

        {optionsCount > 0 && props.children}
      </SelectStyled>
      {helperText && (
        <FormHelperText
          className="label-small-regular"
          sx={{
            color: props.error ? 'var(--red-main)' : 'var(--grey-350)',
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default Select;
