import { Autocomplete, Box, TextField } from '@mui/material';
import { IconExpand } from '@components/icons';
import { AutocompleteMutilePropsType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import Typography from '@components/typography';
import { CustomListBoxComponent, CustomPaper } from '@components/autocomplete';

CustomListBoxComponent.displayName = 'CustomListBoxComponent';

const AutocompleteMultiple = <T,>(props: AutocompleteMutilePropsType<T>) => {
  const { t } = useAppTranslation();

  return (
    <Autocomplete
      multiple
      {...props}
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
          label={props.label}
          placeholder={props.placeholder}
          variant="standard"
          sx={{
            // El alto y el ritmo vertical los pone el bloque «EL CAMPO».
            '.MuiInputBase-root': {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            },
            '.MuiInputBase-input': {
              flex: '1 0 0',
              color: 'var(--black)',
            },
            '.MuiInput-root:hover:before': {
              borderBottom: '1px solid var(--accent-main)',
              outline: 0,
            },
            '.MuiInput-root:before': {
              borderBottom: '1px solid var(--accent-300) !important',
            },
            '.MuiInput-root:after': {
              borderBottom: '1px solid var(--accent-main)',
            },
            '.MuiInputLabel-root': {
              color: 'var(--accent-350)',
              '&.Mui-focused': {
                color: 'var(--accent-main)',
              },
            },
          }}
        />
      )}
    />
  );
};

export default AutocompleteMultiple;
