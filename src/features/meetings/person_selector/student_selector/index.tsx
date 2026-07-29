import { Box, FormControlLabel, Popper, RadioGroup } from '@mui/material';
import { STUDENT_ASSIGNMENT } from '@constants/index';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import {
  IconAssignmetHistory,
  IconClose,
  IconDownload,
  IconFemale,
  IconMale,
  IconPersonPlaceholder,
} from '@components/icons';
import { StudentIconType } from './index.types';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useStudentSelector from './useStudentSelector';
import AssignmentsHistoryDialog from '@features/meetings/assignments_history_dialog';
import AutoComplete from '@components/autocomplete';
import IconButton from '@components/icon_button';
import Radio from '@components/radio';
import Typography from '@components/typography';

const StudentIcon = ({ type, value }: StudentIconType) => (
  <>
    {!value && type && STUDENT_ASSIGNMENT.includes(type) && (
      <IconPersonPlaceholder />
    )}
    {!value && type && !STUDENT_ASSIGNMENT.includes(type) && <IconMale />}

    {value?.person_data.male.value && <IconMale />}
    {value?.person_data.female.value && <IconFemale />}
  </>
);

const StudentSelector = (props: PersonSelectorType) => {
  const showIcon = props.showIcon ?? true;

  const { t } = useAppTranslation();

  const { desktopUp, tabletUp } = useBreakpoints();

  const {
    options,
    showGenderSelector,
    isAssistant,
    value,
    handleSaveAssignment,
    handleCloseHistory,
    handleOpenHistory,
    handleExportS89,
    isExportingS89,
    helperText,
    isHistoryOpen,
    personHistory,
    gender,
    handleGenderChange,
    groupChecked,
    handleToggleGroup,
    showHeader,
    showGroupToggle,
  } = useStudentSelector(props);

  return (
    <Box sx={{ position: 'relative' }}>
      {isHistoryOpen && (
        <AssignmentsHistoryDialog
          open={isHistoryOpen}
          onClose={handleCloseHistory}
          person={value.person_name}
          history={personHistory}
        />
      )}

      <AutoComplete
        // Un nombre largo no cabe y se cortaba con puntos suspensivos, sin
        // forma de leerlo entero: dentro de un <input> el texto no puede
        // partirse en dos líneas. Con `multiline` el campo pasa a ser un
        // <textarea>, crece a lo alto y el nombre se lee completo. Es lo mismo
        // que ya se hizo con los títulos de los discursos públicos.
        multiline
        readOnly={props.readOnly}
        fullWidth={true}
        label={props.label}
        isOptionEqualToValue={(option, value) =>
          option.person_uid === value.person_uid
        }
        getOptionLabel={(option: PersonOptionsType) => option.person_name}
        options={options}
        value={value}
        noOptionsText={
          isAssistant && (
            <Box sx={{ backgroundColor: 'var(--card)' }}>
              <Typography className="body-regular" color="var(--grey-350)">
                {t('tr_selectAStudentFirst')}
              </Typography>
            </Box>
          )
        }
        onChange={(_, value: PersonOptionsType) => handleSaveAssignment(value)}
        slots={{
          popper: (props) => (
            <Popper
              {...props}
              style={{ minWidth: 320 }}
              placement="bottom-start"
            />
          ),
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
              {showIcon && <StudentIcon value={option} />}

              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                <Typography>{option.person_name}</Typography>

                {showGenderSelector &&
                  option.last_assistant.length > 0 &&
                  option.last_assistant !== option.last_assignment && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Typography
                        className="body-small-regular"
                        color="var(--grey-350)"
                      >
                        {t('tr_assistant')}:
                      </Typography>
                      <Typography
                        className="body-small-regular"
                        color="var(--grey-350)"
                      >
                        {option.last_assistant}
                      </Typography>
                    </Box>
                  )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography
                className="body-small-regular"
                color="var(--grey-350)"
                align="center"
                sx={{ width: '85px' }}
              >
                {option.last_assignment}
              </Typography>
              {tabletUp && (
                <Typography
                  className="body-small-regular"
                  color="var(--grey-350)"
                  align="center"
                  sx={{ width: '70px' }}
                >
                  {option.hall}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        optionsHeader={
          <>
            <Typography className="h3" sx={{ padding: '8px 0px' }}>
              {t('tr_participants')}
            </Typography>

            {showHeader && (
              <RadioGroup
                sx={{
                  flexDirection: 'row',
                  padding: '0 0 8px 8px',
                  width: '100%',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
                value={gender}
              >
                {showGenderSelector && (
                  <>
                    <FormControlLabel
                      value="male"
                      control={<Radio />}
                      label={<Typography>{t('tr_male')}</Typography>}
                      onClick={(e) => handleGenderChange(e, 'male')}
                    />
                    <FormControlLabel
                      value="female"
                      control={<Radio />}
                      label={<Typography>{t('tr_female')}</Typography>}
                      onClick={(e) => handleGenderChange(e, 'female')}
                    />
                  </>
                )}

                {showGroupToggle && (
                  <FormControlLabel
                    control={<Radio checked={groupChecked} />}
                    label={<Typography>{t('tr_selectedGroup')}</Typography>}
                    onClick={handleToggleGroup}
                  />
                )}
              </RadioGroup>
            )}

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

              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography
                  className="body-small-regular"
                  color="var(--grey-350)"
                  align="center"
                  sx={{ width: '85px' }}
                >
                  {t('tr_lastAssignment')}
                </Typography>

                {tabletUp && (
                  <Typography
                    className="body-small-regular"
                    color="var(--grey-350)"
                    align="center"
                    sx={{ width: '70px' }}
                  >
                    {t('tr_hall')}
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        }
        styleIcon={false}
        startIcon={
          showIcon ? <StudentIcon type={props.type} value={value} /> : null
        }
        decorator={helperText.length > 0}
        clearIcon={<IconClose width={20} height={20} />}
        sx={{
          '& .MuiInputLabel-root': {
            top: '-5px !important',
          },
          '& .MuiOutlinedInput-root': {
            height: '44px !important',
          },
          '& .MuiOutlinedInput-input': {
            // Hueco para lo que hay a la derecha: X de limpiar (al hover) ·
            // exportar S-89 · historial. El ayudante no lleva el de exportar
            // (la hoja es del estudiante), así que reservarle su sitio le
            // robaría 30px al nombre para nada.
            paddingRight: isAssistant ? '90px !important' : '120px !important',
          },
          '& .MuiAutocomplete-clearIndicator': {
            // La X de limpiar se corre a la izquierda para no caer encima de
            // los íconos propios: uno más a la derecha, un hueco más.
            marginRight: isAssistant ? '30px' : '60px',
          },
        }}
      />

      {value && (
        <>
          {/* La hoja S-89 es UNA por estudiante: el ayudante no recibe la
              suya, su nombre va escrito en la del estudiante. El botón estaba
              también en el ayudante y descargaba exactamente la misma hoja,
              así que solo invitaba a imprimirla dos veces. */}
          {!isAssistant && (
            <IconButton
              sx={{ padding: 0, position: 'absolute', right: 65, top: 10 }}
              title={t(
                'tr_exportS89Sheet',
                'Exportar hoja de asignación (S-89)'
              )}
              onClick={handleExportS89}
              disabled={isExportingS89}
            >
              <IconDownload
                color={
                  helperText.length > 0
                    ? 'var(--orange-dark)'
                    : 'var(--accent-main)'
                }
              />
            </IconButton>
          )}

          <IconButton
            sx={{ padding: 0, position: 'absolute', right: 35, top: 10 }}
            title={t('tr_assignmentHistory')}
            onClick={handleOpenHistory}
          >
            <IconAssignmetHistory
              color={
                helperText.length > 0
                  ? 'var(--orange-dark)'
                  : 'var(--accent-main)'
              }
            />
          </IconButton>
        </>
      )}

      {helperText.length > 0 && (
        <Typography
          className="label-small-regular"
          color="var(--orange-dark)"
          sx={{
            padding: '4px 16px 0 16px',
            maxWidth: desktopUp ? '350px' : '100%',
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default StudentSelector;
