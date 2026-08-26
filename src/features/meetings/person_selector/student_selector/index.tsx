import { Box, FormControlLabel, RadioGroup } from '@mui/material';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import {
  IconAssignmetHistory,
  IconClose,
  IconDownload,
  IconFemale,
  IconMale,
  IconRefreshSchedule,
} from '@components/icons';
import { StudentIconType } from './index.types';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useStudentSelector from './useStudentSelector';
import AssignmentsHistoryDialog from '@features/meetings/assignments_history_dialog';
import AssignmentConfirmed from '@features/meetings/weekly_schedules/assignment_confirmed';
import AssignmentToReplace from '@features/meetings/weekly_schedules/assignment_to_replace';
import useAssignmentToReplace from '@features/meetings/weekly_schedules/assignment_to_replace/useAssignmentToReplace';
import RowMenu from '../row_menu';
import AutoComplete from '@components/autocomplete';
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

  // La marca de «por cambiar»: aquí solo hace falta saber si se puede marcar,
  // cómo está y cómo se cambia. Lo que se DIBUJA va debajo del campo.
  const {
    visible: puedeMarcarCambio,
    toReplace: porCambiar,
    toggle: marcarCambio,
  } = useAssignmentToReplace({
    week: props.week,
    assignment: props.assignment,
  });

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

        {/* El carril: la casilla de «hojita entregada» y el menú, y nada más.
            Llegó a haber cuatro controles aquí —historial, S-89, la casilla y
            «por cambiar»— y con diez partes por semana eso era una pared de
            iconos encima del programa. Las acciones de vez en cuando se fueron
            al menú; la casilla se queda porque es un ESTADO que se repasa de un
            vistazo y se marca quince veces seguidas una tarde de reparto.

            El carril mide lo que la primera línea del campo (56px) y centra: la
            alineación sale por construcción. */}
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
            <AssignmentConfirmed
              week={props.week}
              assignment={props.assignment}
            />

            <RowMenu
              atencion={porCambiar}
              acciones={[
                {
                  clave: 'historial',
                  icono: (
                    <IconAssignmetHistory
                      width={20}
                      height={20}
                      color="var(--accent-main)"
                    />
                  ),
                  texto: t('tr_assignmentHistory'),
                  onClick: handleOpenHistory,
                },
                // La hoja S-89 es UNA por estudiante: el ayudante no recibe la
                // suya, su nombre va escrito en la del estudiante.
                ...(isAssistant
                  ? []
                  : [
                      {
                        clave: 's89',
                        icono: (
                          <IconDownload
                            width={20}
                            height={20}
                            color="var(--accent-main)"
                          />
                        ),
                        texto: t(
                          'tr_exportS89Sheet',
                          'Exportar hoja de asignación (S-89)'
                        ),
                        onClick: handleExportS89,
                        disabled: isExportingS89,
                      },
                    ]),
                ...(puedeMarcarCambio
                  ? [
                      {
                        clave: 'por-cambiar',
                        icono: (
                          <IconRefreshSchedule
                            width={20}
                            height={20}
                            color="var(--orange-dark)"
                          />
                        ),
                        texto: porCambiar
                          ? 'Ya no hace falta cambiarlo'
                          : 'No puede: marcar por cambiar',
                        onClick: marcarCambio,
                      },
                    ]
                  : []),
              ]}
            />
          </Box>
        )}
      </Box>

      {/* Debajo del campo y no en el carril: si el único rastro de que un
          hermano no puede estuviera dentro del menú, habría que abrir diez
          menús cada semana para saber si hay algo pendiente. */}
      <AssignmentToReplace week={props.week} assignment={props.assignment} />

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
