import { Autocomplete, Box, TextField } from '@mui/material';
import { IconExpand } from '@components/icons';
import { AutocompleteMutilePropsType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import Typography from '@components/typography';
import MiniChip from '@components/mini_chip';
import { CustomListBoxComponent, CustomPaper } from '@components/autocomplete';

CustomListBoxComponent.displayName = 'CustomListBoxComponent';

/**
 * Elegir VARIAS cosas: los miembros de una familia, los idiomas de un grupo,
 * los discursos de un orador. Lo elegido se queda dentro del campo en forma de
 * píldoras que se pueden quitar (`MiniChip`).
 *
 * ── Por qué es `outlined` ────────────────────────────────────────────────
 *
 * Estaba clavado a `variant="standard"`, que en MUI es el campo de RAYA: sin
 * caja, sin fondo y sin relleno. Al lado de cualquier otro campo de la app
 * cantaba, y medido lo dice todo:
 *
 *              este campo            cualquier campo de al lado
 *   alto       32                    56
 *   fondo      transparente          rgb(240, 244, 250)
 *   radio      0                     12
 *   relleno    ninguno               14px
 *
 * Y de ahí venía que las píldoras pareciesen pegadas a la etiqueta: sin caja
 * ni relleno no había NADA entre una cosa y la otra. El hermano de al lado
 * —`@components/autocomplete`, el de elegir uno— ya era `outlined`; eran los
 * dos únicos campos de la app que no se parecían entre sí.
 *
 * Con `outlined` lo coge el bloque «EL CAMPO» de `global/index.css`: fondo,
 * radio, anillo de foco, sitio de la etiqueta y 56 de alto MÍNIMO —`height:
 * auto`—, así que la caja crece sola cuando las píldoras pasan de una línea.
 */
const AutocompleteMultiple = <T,>({
  label,
  placeholder,
  ...props
}: AutocompleteMutilePropsType<T>) => {
  const { t } = useAppTranslation();

  return (
    <Autocomplete
      multiple
      {...props}
      // Las píldoras de lo elegido son las de la app, se pidan o no.
      //
      // Seis de los siete sitios pasaban su propio `renderValue` con un
      // `MiniChip` dentro —porque su aspa tiene que llamar a SU manejador, no
      // al genérico— y el séptimo, Editar territorio, no pasaba nada. Y quien
      // no pasa nada no se queda sin píldoras: se queda con las de MUI, que
      // son grises fijas y no saben de modo oscuro. El mismo componente
      // pintando dos chips distintos según quién lo llamara.
      renderValue={
        props.renderValue ??
        ((value, getItemProps) =>
          (value as T[]).map((option, index) => {
            const { onDelete } = getItemProps({ index });

            return (
              <MiniChip
                key={`${index}-${props.getOptionLabel?.(option) ?? ''}`}
                label={props.getOptionLabel?.(option) ?? String(option)}
                edit={true}
                onDelete={() => onDelete(undefined)}
              />
            );
          }))
      }
      clearIcon={false}
      popupIcon={<IconExpand color="var(--ink-2)" width={20} height={20} />}
      PaperComponent={CustomPaper}
      ListboxComponent={CustomListBoxComponent}
      sx={{
        '& .MuiAutocomplete-popupIndicator': {
          color: 'var(--black)',
        },
      }}
      noOptionsText={
        <Box sx={{ backgroundColor: 'var(--white)' }}>
          <Typography className="body-regular">{t('tr_noOptions')}</Typography>
        </Box>
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          sx={{
            // El alto, el fondo, el radio y el sitio de la etiqueta los pone
            // «EL CAMPO». Aquí solo el ritmo de las píldoras DENTRO.
            '.MuiInputBase-root': {
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            },
            '.MuiInputBase-input': {
              flex: '1 0 0',
              color: 'var(--black)',
              // Sin un mínimo, el hueco de escribir se queda sin sitio en
              // cuanto hay dos o tres píldoras y no se puede seguir buscando.
              minWidth: '60px',
            },
          }}
        />
      )}
    />
  );
};

export default AutocompleteMultiple;
