import { Box, FormControlLabel, RadioGroup } from '@mui/material';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import {
  IconAssignmetHistory,
  IconClose,
  IconDownload,
  IconFemale,
  IconMale,
} from '@components/icons';
import { StudentIconType } from './index.types';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useStudentSelector from './useStudentSelector';
import AssignmentsHistoryDialog from '@features/meetings/assignments_history_dialog';
import AssignmentConfirmed from '@features/meetings/weekly_schedules/assignment_confirmed';
import AutoComplete from '@components/autocomplete';
import IconButton from '@components/icon_button';
import Radio from '@components/radio';
import Typography from '@components/typography';
import OptionsPopper from '@components/options_popper';

/**
 * El icono de género vive solo en la LISTA desplegable, donde sí informa
 * (al elegir para una demostración importa quién es hermana). En el campo ya
 * no se dibuja: el nombre elegido no necesita que un muñequito lo repita.
 */
const StudentIcon = ({ value }: StudentIconType) => (
  <>
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
    <Box>
      {isHistoryOpen && (
        <AssignmentsHistoryDialog
          open={isHistoryOpen}
          onClose={handleCloseHistory}
          person={value.person_name}
          history={personHistory}
          assignmentType={props.type}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
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
            onChange={(_, value: PersonOptionsType) =>
              handleSaveAssignment(value)
            }
            slots={{
              popper: (props) => <OptionsPopper {...props} />,
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
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
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

                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
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
            decorator={helperText.length > 0}
            clearIcon={<IconClose width={20} height={20} />}
            sx={{
              '& .MuiOutlinedInput-input': {
                // Hueco para la X de limpiar y la flecha, y nada más: es lo que
                // MUI reservaría solo (65px) si no le pisáramos el padding del
                // root. Aquí dentro ya no vive ningún botón.
                paddingRight: '65px !important',
              },
            }}
          />
        </Box>

        {/* TODAS las acciones de la fila en un solo carril: historial, hoja
            S-89 y la casilla de "hojita entregada". Antes cada una colgaba de
            un ancla distinta —el historial en posición absoluta dentro del
            campo, la descarga con un margen a ojo, la casilla centrada contra
            el bloque entero, línea de ayuda incluida— y por eso nunca quedaban
            a la misma altura. El carril mide lo que la primera línea del campo
            (56px) y centra: la alineación sale por construcción. */}
        {value && (
          <Box
            sx={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <IconButton
              // El IconButton compartido trae `edge="start"` (-12px de margen
              // izquierdo, pensado para pegarlo al borde de una barra); aquí
              // rompería el ritmo del carril.
              edge={false}
              sx={{ padding: 0 }}
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

            {/* La hoja S-89 es UNA por estudiante: el ayudante no recibe la
                suya, su nombre va escrito en la del estudiante. */}
            {!isAssistant && (
              <IconButton
                edge={false}
                sx={{ padding: 0 }}
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

            {/* Se esconde sola donde no toca (partes sin hojita, quien no
                edita la reunión). Vive aquí y no en person_selector para que
                comparta ancla con los otros dos botones. */}
            <AssignmentConfirmed
              week={props.week}
              assignment={props.assignment}
            />
          </Box>
        )}
      </Box>

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
