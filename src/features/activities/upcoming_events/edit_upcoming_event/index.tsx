import { cloneElement, useMemo } from 'react';
import { Box } from '@mui/material';
import { IconCheck, IconClose, IconDelete } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
} from '@definition/upcoming_events';
import { formatDate } from '@utils/date';
import { ASSEMBLY_CATEGORIES, decorationsForEvent } from '../decorations_for_event';
import { EditUpcomingEventProps } from './index.types';
import useEditUpcomingEvent from './useEditUpcomingEvent';
import Button from '@components/button';
import DatePicker from '@components/date_picker';
import Divider from '@components/divider';
import IconButton from '@components/icon_button';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import TextField from '@components/textfield';
import TimePicker from '@components/time_picker';
import Typography from '@components/typography';

// Oculta visualmente un control sin sacarlo del árbol de accesibilidad ni
// del orden de tabulación (a diferencia del atributo `hidden`).
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

const EditUpcomingEvent = (props: EditUpcomingEventProps) => {
  const { t } = useAppTranslation();

  const { desktopUp, tabletUp } = useBreakpoints();

  const {
    hour24,
    localEvent,
    errors,
    handleChangeEventCategory,
    handleChangeEventCustomTitle,
    handleChangeEventDescription,
    handleChangeEventTopic,
    handleChangeAssemblyRepresentative,
    handleChangeJwLibraryUrl,
    uploadingCoverPhoto,
    handleUploadCoverPhoto,
    handleDeleteCoverPhoto,
    handleSaveEvent,
    handleDeleteEvent,
    handleChangeEventDuration,
    handleChangeEventStartDate,
    handleChangeEventStartTime,
    handleChangeEventEndDate,
    handleChangeEventEndTime,
    dailyTimesList,
    handleChangeDailyTime,
  } = useEditUpcomingEvent(props);

  const isAssemblyCategory = ASSEMBLY_CATEGORIES.includes(
    localEvent.event_data.category
  );

  // El valor guardado (category) es la posición de la opción en
  // decorationsForEvent, así que ese arreglo no se puede reordenar ni
  // recortar sin corromper eventos ya guardados. Se ordena/filtra solo la
  // lista que se muestra en el desplegable, alfabéticamente por el texto ya
  // traducido, dejando "Personalizado" siempre al final.
  //
  // "Visita del superintendente de circuito" se excluye a propósito: ese
  // evento ya se crea y mantiene solo desde la página dedicada de la
  // Visita (Congregación > Visita del superintendente), que también
  // proyecta las reuniones con precursores/ancianos — añadirlo aquí a mano
  // duplicaría esa gestión.
  const sortedTypeOptions = useMemo(() => {
    const withIndex = decorationsForEvent
      .map((option, index) => ({ option, index }))
      .filter(
        ({ option }) => option.translationKey !== 'tr_circuitOverseerWeek'
      );

    const custom = withIndex.filter(
      ({ option }) => option.translationKey === 'tr_custom'
    );
    const rest = withIndex.filter(
      ({ option }) => option.translationKey !== 'tr_custom'
    );

    rest.sort((a, b) =>
      t(a.option.translationKey).localeCompare(t(b.option.translationKey), 'es')
    );

    return [...rest, ...custom];
  }, [t]);

  return (
    <Box
      sx={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: 'var(--card)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: tabletUp ? 'space-between' : 'unset',
          gap: '16px',
        }}
      >
        <Typography className="h2" color="var(--black)">
          {props.type == 'add'
            ? t('tr_addUpcomingEvent')
            : t('tr_editUpcomingEvent')}
        </Typography>

        {props.type === 'edit' && !tabletUp && (
          <IconButton onClick={handleDeleteEvent} color="error">
            <IconDelete color="var(--red-main)" height={20} width={20} />
          </IconButton>
        )}

        {props.type === 'edit' && tabletUp && (
          <Button
            variant="small"
            color="red"
            startIcon={<IconDelete />}
            sx={{
              height: '32px',
              minHeight: '32px !important',
            }}
            onClick={handleDeleteEvent}
          >
            {t('tr_delete')}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
            flexWrap: !desktopUp ? 'wrap' : 'nowrap',
            '& > *': { flex: !desktopUp ? 'none' : '1' },
          }}
        >
          <Select
            label={t('tr_eventType')}
            value={localEvent.event_data.category ?? ''}
            onChange={handleChangeEventCategory}
            error={errors.category}
            helperText={errors.category && t('tr_fillRequiredField')}
          >
            {sortedTypeOptions.map(({ option, index }) => (
              <MenuItem value={index} key={option.translationKey}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  {cloneElement(option.icon, { color: 'var(--black)' })}
                  <Typography className="body-regular" color="var(--black)">
                    {t(option.translationKey)}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>

          {localEvent.event_data.category ===
            UpcomingEventCategory.AssemblyWeek && (
            <Select
              label={t('tr_assemblyType')}
              value={localEvent.event_data.assemblyRepresentative ?? ''}
              onChange={handleChangeAssemblyRepresentative}
            >
              <MenuItem value="branch">
                <Typography
                  className="body-regular"
                  color="var(--black)"
                  sx={{ '&::first-letter': { textTransform: 'uppercase' } }}
                >
                  {t('tr_assemblyRepBranch')}
                </Typography>
              </MenuItem>
              <MenuItem value="co">
                <Typography
                  className="body-regular"
                  color="var(--black)"
                  sx={{ '&::first-letter': { textTransform: 'uppercase' } }}
                >
                  {t('tr_assemblyRepCO')}
                </Typography>
              </MenuItem>
            </Select>
          )}

          {localEvent.event_data.category === UpcomingEventCategory.Custom && (
            <TextField
              label={t('tr_eventTitle')}
              value={localEvent.event_data.custom}
              onChange={handleChangeEventCustomTitle}
              error={errors.custom}
              helperText={errors.custom && t('tr_fillRequiredField')}
            />
          )}

          <TextField
            label={t('tr_eventTopic')}
            value={localEvent.event_data.topic ?? ''}
            onChange={handleChangeEventTopic}
          />

          <TextField
            label={t('tr_eventDescription')}
            value={localEvent.event_data.description}
            onChange={handleChangeEventDescription}
          />
        </Box>

        <Divider color="var(--line)" />

        <Typography className="h4">{t('tr_dateAndTime')}</Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',

            flexWrap: !desktopUp ? 'wrap' : 'nowrap',
          }}
        >
          <Select
            label={t('tr_eventDuration')}
            onChange={handleChangeEventDuration}
            value={localEvent.event_data.duration ?? ''}
            error={errors.duration}
            helperText={errors.duration && t('tr_fillRequiredField')}
          >
            <MenuItem value={UpcomingEventDuration.SingleDay} key={0}>
              <Typography className="body-regular" color="var(--black)">
                {t('tr_singleDay')}
              </Typography>
            </MenuItem>
            <MenuItem value={UpcomingEventDuration.MultipleDays} key={1}>
              <Typography className="body-regular" color="var(--black)">
                {t('tr_multipleDays')}
              </Typography>
            </MenuItem>
          </Select>

          {localEvent.event_data.duration ===
          UpcomingEventDuration.SingleDay ? (
            <>
              <DatePicker
                label={t('tr_date')}
                onChange={handleChangeEventStartDate}
                value={new Date(localEvent.event_data.start)}
              />
              <TimePicker
                onChange={handleChangeEventStartTime}
                label={t('tr_startTime')}
                ampm={!hour24}
                sx={{ minWidth: hour24 ? '140px' : '150px' }}
                value={new Date(localEvent.event_data.start)}
              />
              <TimePicker
                onChange={handleChangeEventEndTime}
                label={t('tr_endTime')}
                ampm={!hour24}
                sx={{ minWidth: hour24 ? '140px' : '150px' }}
                value={new Date(localEvent.event_data.end)}
              />
            </>
          ) : (
            <>
              <DatePicker
                label={t('tr_startDate')}
                onChange={handleChangeEventStartDate}
                value={new Date(localEvent.event_data.start)}
              />
              <DatePicker
                label={t('tr_endDate')}
                onChange={handleChangeEventEndDate}
                value={new Date(localEvent.event_data.end)}
              />
            </>
          )}
        </Box>

        {localEvent.event_data.duration === UpcomingEventDuration.MultipleDays &&
          dailyTimesList.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <Typography className="body-small-semibold" color="var(--grey-400)">
                {t('tr_dailyTimesTitle', 'Horario de cada día')}
              </Typography>

              {dailyTimesList.map((day, index) => (
                <Box
                  key={day.date}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    alignItems: 'center',
                    flexWrap: !desktopUp ? 'wrap' : 'nowrap',
                  }}
                >
                  <Typography
                    className="body-small-semibold"
                    color="var(--black)"
                    sx={{ minWidth: '96px' }}
                  >
                    {`${t('tr_day')} ${index + 1} · ${formatDate(day.start, 'dd/MM')}`}
                  </Typography>

                  <TimePicker
                    onChange={(value: Date) =>
                      handleChangeDailyTime(day.date, 'start', value)
                    }
                    label={t('tr_startTime')}
                    ampm={!hour24}
                    sx={{ minWidth: hour24 ? '140px' : '150px' }}
                    value={day.start}
                  />
                  <TimePicker
                    onChange={(value: Date) =>
                      handleChangeDailyTime(day.date, 'end', value)
                    }
                    label={t('tr_endTime')}
                    ampm={!hour24}
                    sx={{ minWidth: hour24 ? '140px' : '150px' }}
                    value={day.end}
                  />
                </Box>
              ))}
            </Box>
          )}

        {isAssemblyCategory && (
          <>
            <Divider color="var(--line)" />

            <Typography className="h4">{t('tr_assemblySection')}</Typography>

            <TextField
              label={t('tr_jwLibraryUrl')}
              value={localEvent.event_data.jwLibraryUrl ?? ''}
              onChange={handleChangeJwLibraryUrl}
              placeholder="https://www.jw.org/finder?..."
            />

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <Typography className="body-small-semibold" color="var(--grey-400)">
                {t('tr_coverPhoto')}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <label style={{ cursor: uploadingCoverPhoto ? 'default' : 'pointer' }}>
                  <Box
                    sx={{
                      padding: '8px 16px',
                      borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--accent-main)',
                      color: 'var(--accent-main)',
                      fontWeight: 600,
                      fontSize: '14px',
                      textAlign: 'center',
                    }}
                  >
                    {uploadingCoverPhoto
                      ? t('tr_uploadingCoverPhoto')
                      : localEvent.event_data.coverPhotoUrl
                        ? t('tr_changeCoverPhoto')
                        : t('tr_uploadCoverPhoto')}
                  </Box>
                  <Box
                    component="input"
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={uploadingCoverPhoto}
                    onChange={(e) => {
                      handleUploadCoverPhoto(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                    sx={visuallyHidden}
                  />
                </label>

                {localEvent.event_data.coverPhotoUrl && (
                  <Button
                    variant="secondary"
                    color="red"
                    disabled={uploadingCoverPhoto}
                    onClick={handleDeleteCoverPhoto}
                  >
                    {t('tr_delete')}
                  </Button>
                )}
              </Box>

              {localEvent.event_data.coverPhotoUrl && (
                <Box
                  component="img"
                  src={localEvent.event_data.coverPhotoUrl}
                  alt=""
                  sx={{
                    width: '100%',
                    maxWidth: '360px',
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    // Radio concéntrico con el del formulario (26px,
                    // var(--r-lg)) menos su padding fijo de 16px — ver la
                    // misma nota en upcoming_event/index.tsx.
                    borderRadius: '10px',
                  }}
                />
              )}
            </Box>
          </>
        )}

        <Divider color="var(--line)" />
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          variant="secondary"
          color="red"
          startIcon={<IconClose />}
          onClick={props.onCancel}
        >
          {t('tr_cancel')}
        </Button>
        <Button
          variant="secondary"
          startIcon={<IconCheck />}
          onClick={handleSaveEvent}
        >
          {t('tr_done')}
        </Button>
      </Box>
    </Box>
  );
};

export default EditUpcomingEvent;
