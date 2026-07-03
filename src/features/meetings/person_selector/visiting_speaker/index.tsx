import { Box, Popper } from '@mui/material';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import { IconClose, IconMale } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useVisitingSpeaker from './useVisitingSpeaker';
import AutoComplete from '@components/autocomplete';
import Button from '@components/button';
import Typography from '@components/typography';
import QuickAddSpeaker from './quick_add';

const VisitingSpeaker = (props: PersonSelectorType) => {
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
  } = useVisitingSpeaker(props);

  return (
    <>
      <AutoComplete
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
            return (
              <Popper
                {...props}
                style={{ minWidth: 320 }}
                placement="bottom-start"
              />
            );
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
        startIcon={showIcon ? <IconMale /> : null}
        clearIcon={<IconClose width={20} height={20} />}
      />

      {inputValue.length > 0 && !value && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {props.helperNode}
          <Button
            variant="tertiary"
            sx={{ alignSelf: 'flex-start', padding: '4px 16px' }}
            onClick={handleOpenQuickAdd}
          >
            Añadir orador nuevo
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
