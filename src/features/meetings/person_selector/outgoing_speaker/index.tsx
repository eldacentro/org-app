import { Box } from '@mui/material';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import { IconClose, IconMale } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useOutgoingSpeaker from './useOutgoingSpeaker';
import AutoComplete from '@components/autocomplete';
import Typography from '@components/typography';
import OptionsPopper from '@components/options_popper';

const OutgoingSpeaker = (props: PersonSelectorType) => {
  const showIcon = props.showIcon;

  const { t } = useAppTranslation();

  const { options, handleSaveAssignment, value, helperText } =
    useOutgoingSpeaker(props);

  return (
    <Box sx={{ width: '100%' }}>
      <AutoComplete
        // Un nombre largo no cabe y se cortaba con puntos suspensivos, sin
        // forma de leerlo entero: dentro de un <input> el texto no puede
        // partirse en dos líneas. Con `multiline` el campo pasa a ser un
        // <textarea>, crece a lo alto y el nombre se lee completo. Es lo mismo
        // que ya se hizo con los títulos de los discursos públicos.
        multiline
        readOnly={props.readOnly}
        label={props.label}
        isOptionEqualToValue={(option, value) =>
          option.person_uid === value.person_uid
        }
        getOptionLabel={(option: PersonOptionsType) => option.person_name}
        options={options}
        value={value}
        onChange={(_, value: PersonOptionsType) => handleSaveAssignment(value)}
        fullWidth={true}
        slots={{
          popper(props) {
            return <OptionsPopper {...props} />;
          },
        }}
        renderOption={(props, option) => (
          <Box
            component="li"
            {...props}
            sx={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'space-between',
              padding: '8px 10px 0 0',
            }}
            key={option.person_uid}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
              }}
            >
              {showIcon && <IconMale />}

              <Typography className="body-regular">
                {option.person_name}
              </Typography>
            </Box>
          </Box>
        )}
        optionsHeader={
          <>
            <Typography className="h3" sx={{ padding: '8px 0px' }}>
              {t('tr_brothers')}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'space-between',
                padding: '8px 10px 0 0',
              }}
            >
              <Typography
                className="body-small-regular"
                color="var(--grey-350)"
                sx={{ width: '200px' }}
              >
                {t('tr_name')}
              </Typography>
            </Box>
          </>
        }
        styleIcon={false}
        clearIcon={<IconClose width={20} height={20} />}
      />

      {/* El mismo aviso, con la misma pinta, que en las partes de la reunión
          (ver `brother_selector`): naranja, debajo del campo. Aquí faltaba, así
          que un hermano al que le tocaba salir a hablar el día que estaba de
          viaje no lo decía nadie hasta la tira de arriba — y esa habla del mes,
          no de la casilla. */}
      {helperText.length > 0 && (
        <Typography
          className="label-small-regular"
          color="var(--orange-dark)"
          sx={{ padding: '4px 16px 0 16px' }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default OutgoingSpeaker;
