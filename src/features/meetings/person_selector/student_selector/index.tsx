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
    <Box>
      {isHistoryOpen && (
        <AssignmentsHistoryDialog
          open={isHistoryOpen}
          onClose={handleCloseHistory}
          person={value.person_name}
          history={personHistory}
        />
      )}

      {/* El campo y, FUERA de él, el botón de la hoja. Dentro de la caja
          reservaba 40px de los 120 que se le quitaban al nombre; ahí fuera
          esos 40px vuelven al texto y el botón se ve igual de bien. La caja
          conserva su `position: relative` porque el historial va pegado a su
          borde derecho, no al de la fila. */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
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
            styleIcon={false}
            startIcon={
              showIcon ? <StudentIcon type={props.type} value={value} /> : null
            }
            decorator={helperText.length > 0}
            clearIcon={<IconClose width={20} height={20} />}
            sx={{
              '& .MuiInputLabel-root[data-shrink=false]': {
                // Solo la etiqueta SIN encoger (campo vacío) y solo aquí: con
                // `multiline` la caja no tiene altura fija y MUI ya la centra,
                // así que subirla la dejaba montada sobre el borde del recuadro.
                top: 0,
              },
              '& .MuiOutlinedInput-root': {
                // Alto MÍNIMO, no fijo. Con `multiline` el nombre que no cabe pasa
                // a una segunda línea, y una altura clavada con `!important` deja
                // esa línea fuera del recuadro: el texto se ve aplastado contra
                // los bordes. Así la caja crece con el contenido y conserva su
                // aspecto de siempre cuando el nombre cabe en una línea.
                minHeight: '44px',
              },
              '& .MuiOutlinedInput-input': {
                // Hueco para la X de limpiar (al pasar por encima) y el
                // historial. Eran 120px cuando el botón de la hoja S-89 también
                // iba aquí dentro, y con eso al nombre le quedaban 63px en un
                // móvil: se cortaba hasta "Daniel Cook", y al partirlo en dos
                // líneas salían cinco. Ese botón está ahora FUERA de la caja.
                paddingRight: '80px !important',
              },
              '& .MuiAutocomplete-clearIndicator': {
                // La X de limpiar se corre para no caer encima del historial.
                marginRight: '30px',
              },
            }}
          />

          {value && (
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
          )}
        </Box>

        {/* La hoja S-89 es UNA por estudiante: el ayudante no recibe la suya,
            su nombre va escrito en la del estudiante. */}
        {value && !isAssistant && (
          <IconButton
            // `edge={false}` NO es decorativo: el IconButton compartido lleva
            // `edge="start"` puesto a fuego, y eso es un `margin-left: -12px`
            // pensado para un botón pegado al borde IZQUIERDO de una barra.
            // Aquí el botón va a la DERECHA de un campo, así que esos -12px lo
            // metían encima del recuadro: se veía mitad dentro, mitad fuera,
            // montado sobre el borde.
            edge={false}
            sx={{ padding: 0, marginTop: '12px' }}
            title={t('tr_exportS89Sheet', 'Exportar hoja de asignación (S-89)')}
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
