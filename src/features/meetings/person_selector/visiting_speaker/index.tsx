import { Box } from '@mui/material';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import { IconClose, IconMale } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useVisitingSpeaker from './useVisitingSpeaker';
import AutoComplete from '@components/autocomplete';
import Button from '@components/button';
import Typography from '@components/typography';
import QuickAddSpeaker from './quick_add';
import OptionsPopper from '@components/options_popper';

const VisitingSpeaker = (props: PersonSelectorType) => {
  /**
   * Solo para la LISTA desplegable. En el campo NO va: el muñequito lo quitó
   * de ahí `9cd2e4b29` —"el nombre elegido no necesita que un icono lo
   * repita"— de los selectores de hermano y de estudiante, pero los cuatro de
   * orador se quedaron fuera de aquel barrido.
   *
   * En tres no se notaba porque su `showIcon` no traía valor por defecto y
   * nadie se lo pasa. Este sí lo traía, así que en Reunión de fin de semana
   * salía un muñequito montado encima del rótulo "Orador".
   */
  const showIcon = props.showIcon ?? true;

  const { t } = useAppTranslation();

  const {
    options,
    handleSaveAssignment,
    value,
    handleValueChange,
    handleValueSave,
    inputValue,
    isQuickAddOpen,
    handleOpenQuickAdd,
    handleCloseQuickAdd,
    handleSpeakerCreated,
    congregacionDelOrador,
  } = useVisitingSpeaker(props);

  return (
    <>
      <AutoComplete
        // Un nombre largo no cabe y se cortaba con puntos suspensivos, sin
        // forma de leerlo entero: dentro de un <input> el texto no puede
        // partirse en dos líneas. Con `multiline` el campo pasa a ser un
        // <textarea>, crece a lo alto y el nombre se lee completo. Es lo mismo
        // que ya se hizo con los títulos de los discursos públicos.
        multiline
        freeSolo={true}
        label={props.label}
        isOptionEqualToValue={(option, value) =>
          option.person_uid === value.person_uid
        }
        getOptionLabel={(option: PersonOptionsType) => option.person_name}
        options={options}
        value={value}
        inputValue={inputValue}
        onInputChange={(_, value) => handleValueChange(value)}
        onKeyUp={handleValueSave}
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

              <Typography>{option.person_name}</Typography>
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

      {/* De qué congregación es. Es lo que hay que mirar al cuadrar el fin de
          semana —para no repetir congregación dos domingos seguidos y para
          saber a quién llamar—, y hasta ahora obligaba a irse al catálogo de
          oradores a buscarlo. Debajo del campo y en gris, igual que los demás
          textos de apoyo del editor. */}
      {congregacionDelOrador.length > 0 && (
        <Typography
          className="label-small-regular"
          color="var(--grey-350)"
          sx={{ padding: '4px 16px 0 16px' }}
        >
          {congregacionDelOrador}
        </Typography>
      )}

      {inputValue.length > 0 && !value && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {props.helperNode}
          <Button
            variant="tertiary"
            sx={{ alignSelf: 'flex-start', padding: '4px 16px' }}
            onClick={handleOpenQuickAdd}
          >
            Añadir orador
          </Button>
        </Box>
      )}

      <QuickAddSpeaker
        open={isQuickAddOpen}
        onClose={handleCloseQuickAdd}
        onCreated={handleSpeakerCreated}
      />
    </>
  );
};

export default VisitingSpeaker;
