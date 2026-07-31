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

  return (
    <FormControl
      fullWidth
      size="small"
      sx={props.sx}
      disabled={props.disabled ?? false}
    >
      <InputLabel
        className="body-regular"
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
        {(props.children as []).length === 0 && (
          <MenuItem value="">
            <Typography className="body-small-regular" color="var(--grey-350)">
              {t('tr_noOptions')}
            </Typography>
          </MenuItem>
        )}

        {(props.children as []).length > 0 && props.children}
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
