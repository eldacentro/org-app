import { Box } from '@mui/material';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import { IconAssignmetHistory, IconClose, IconEdit } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useBrotherSelector from './useBrotherSelector';
import AutoComplete from '@components/autocomplete';
import AssignmentsHistoryDialog from '@features/meetings/assignments_history_dialog';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';
import OptionsPopper from '@components/options_popper';

const BrotherSelector = (props: PersonSelectorType) => {
  const showAssignmentsHistory = props.showAssignmentsHistory ?? true;

  const { t } = useAppTranslation();

  const { desktopUp } = useBreakpoints();

  const {
    options,
    handleSaveAssignment,
    value,
    helperText,
    handleCloseHistory,
    handleOpenHistory,
    isHistoryOpen,
    personHistory,
    personHistoryForSlot,
    isFreeSolo,
    inputValue,
    handleValueChange,
    isLinkedPart,
  } = useBrotherSelector(props);

  return (
    <Box>
      {isHistoryOpen && (
        <AssignmentsHistoryDialog
          open={isHistoryOpen}
          onClose={handleCloseHistory}
          person={value.person_name}
          history={personHistory}
          assignmentType={props.dept ? undefined : props.type}
          historyCurrent={personHistoryForSlot}
          allLabel={props.dept ? 'Todos los departamentos' : undefined}
          assignmentLabel={props.dept ? 'Este puesto' : undefined}
        />
      )}

      {/* Misma estructura que el selector de estudiante: el campo y, a su
          derecha, el carril de acciones a la altura de la primera línea
          (56px). El historial iba en posición absoluta DENTRO del campo, con
          la X de limpiar corrida 30px para esquivarlo: dos hacks para
          sostener un botón donde no le tocaba estar. */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AutoComplete
            // Un nombre largo no cabe y se cortaba con puntos suspensivos, sin
            // forma de leerlo entero: dentro de un <input> el texto no puede
            // partirse en dos líneas. Con `multiline` el campo pasa a ser un
            // <textarea>, crece a lo alto y el nombre se lee completo. Es lo mismo
            // que ya se hizo con los títulos de los discursos públicos.
            multiline
            freeSolo={isFreeSolo}
            readOnly={props.readOnly}
            label={props.label}
            isOptionEqualToValue={(option, value) =>
              option.person_uid === value.person_uid
            }
            getOptionLabel={(option: PersonOptionsType) => option.person_name}
            options={options}
            value={value}
            endIcon={props.endIcon}
            inputValue={inputValue}
            onInputChange={(_, value) => handleValueChange(value)}
            onChange={(_, value: PersonOptionsType) =>
              handleSaveAssignment(value)
            }
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
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <Typography className="body-regular">
                      {option.person_name}
                    </Typography>
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
                  </Box>
                </Box>
              </>
            }
            decorator={helperText.length > 0 && !isLinkedPart}
            clearIcon={<IconClose width={20} height={20} />}
            sx={{
              '& .MuiOutlinedInput-input': {
                // Hueco para la X de limpiar y la flecha, y nada más: es lo que
                // MUI reservaría solo (65px) si no le pisáramos el padding del
                // root. Aquí dentro ya no vive ningún botón.
                paddingRight: props.endIcon
                  ? '10px !important'
                  : '65px !important',
              },
            }}
          />
        </Box>

        {((showAssignmentsHistory && value) || props.onEditClick) && (
          <Box
            sx={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            {showAssignmentsHistory && value && (
              <IconButton
                // El IconButton compartido trae `edge="start"` (-12px de
                // margen izquierdo); aquí descolocaría el carril.
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
            )}

            {props.onEditClick && (
              <IconButton
                edge={false}
                sx={{ padding: 0 }}
                onClick={props.onEditClick}
              >
                <IconEdit
                  color={
                    helperText.length > 0
                      ? 'var(--orange-dark)'
                      : 'var(--accent-main)'
                  }
                />
              </IconButton>
            )}
          </Box>
        )}
      </Box>

      {helperText.length > 0 && (
        <Typography
          className="label-small-regular"
          color={isLinkedPart ? 'var(--grey-350)' : 'var(--orange-dark)'}
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

export default BrotherSelector;
