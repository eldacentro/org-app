import { Box, Checkbox, FormControlLabel } from '@mui/material';
import Dialog from '@components/dialog';
import Button from '@components/button';
import TextField from '@components/textfield';
import AutoComplete from '@components/autocomplete';
import Typography from '@components/typography';
import { IconGroups } from '@components/icons';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import useQuickAddSpeaker from './useQuickAddSpeaker';
import { QuickAddSpeakerType } from './index.types';

const QuickAddSpeaker = (props: QuickAddSpeakerType) => {
  const {
    congregations,
    step,
    congInputValue,
    selectedCong,
    handleCongInputChange,
    handleCongSelect,
    canContinue,
    handleContinueToSpeaker,
    handleMoveBackToCongregation,
    firstname,
    setFirstname,
    lastname,
    setLastname,
    isElder,
    setIsElder,
    isMinisterialServant,
    setIsMinisterialServant,
    canSave,
    handleSave,
    isSaving,
    handleClose,
  } = useQuickAddSpeaker(props);

  return (
    <Dialog open={props.open} onClose={handleClose} sx={{ padding: '24px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Typography className="h2">Añadir orador nuevo</Typography>

        {step === 'congregation' && (
          <>
            <Typography color="var(--grey-400)">
              Busca la congregación del orador, o escribe el nombre de una
              congregación nueva.
            </Typography>

            <AutoComplete
              freeSolo
              label="Congregación"
              options={congregations}
              value={selectedCong}
              inputValue={congInputValue}
              onInputChange={(_, value) => handleCongInputChange(value)}
              onChange={(_, value: SpeakersCongregationsType | string | null) =>
                handleCongSelect(typeof value === 'string' ? null : value)
              }
              getOptionLabel={(option: SpeakersCongregationsType | string) =>
                typeof option === 'string' ? option : option.cong_data.cong_name.value
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              startIcon={<IconGroups />}
              fullWidth
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                variant="main"
                disabled={!canContinue || isSaving}
                onClick={handleContinueToSpeaker}
              >
                {selectedCong ? 'Continuar' : 'Crear congregación y continuar'}
              </Button>
              <Button variant="tertiary" onClick={handleClose}>
                Cancelar
              </Button>
            </Box>
          </>
        )}

        {step === 'speaker' && (
          <>
            <Typography color="var(--grey-400)">
              {selectedCong?.cong_data.cong_name.value}
            </Typography>

            <TextField
              label="Nombre"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
            <TextField
              label="Apellido"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
            />

            <Box sx={{ display: 'flex', gap: '16px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isElder}
                    onChange={(e) => setIsElder(e.target.checked)}
                  />
                }
                label="Anciano"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isMinisterialServant}
                    onChange={(e) => setIsMinisterialServant(e.target.checked)}
                  />
                }
                label="Siervo ministerial"
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="main" disabled={!canSave || isSaving} onClick={handleSave}>
                Guardar
              </Button>
              <Button variant="secondary" onClick={handleMoveBackToCongregation}>
                Atrás
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default QuickAddSpeaker;
