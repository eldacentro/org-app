import { Stack } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { Field, FieldContainer } from '@features/ministry/report/report_form_dialog/service_time/index.styles';
import useServiceTime from '@features/ministry/report/report_form_dialog/service_time/useServiceTime';
import BibleStudiesList from '@features/ministry/report/report_form_dialog/service_time/bible_studies_list';
import BibleStudySelector from '@features/ministry/report/bible_study_selector';
import Button from '@components/button';
import HoursCreditPresets from '@features/ministry/report/hours_credit_presets';
import HoursEditor from '@features/ministry/report/hours_editor';
import IconButton from '@components/icon_button';
import StandardEditor from '@features/ministry/report/standard_editor';
import Typography from '@components/typography';
import { IconDelete } from '@components/icons';

/**
 * Cuerpo del editor de un día — el mismo contenido que ya tenía el diálogo
 * "Registro diario" (`report_form_dialog/service_time`), reutilizando el
 * mismo hook `useServiceTime` (que ya opera sobre el borrador compartido
 * `reportUserDraftState`), solo sin la cabecera/selector de fecha/botones
 * de cancelar del diálogo — aquí el día ya está fijo (la fila en la que se
 * expandió) y "cerrar" es simplemente volver a colapsar la fila.
 */
const DayRowEditor = ({
  dateStr,
  onSaved,
  hasExistingReport,
}: {
  dateStr: string;
  onSaved: () => void;
  hasExistingReport: boolean;
}) => {
  const { t } = useAppTranslation();
  const { tabletUp } = useBreakpoints();

  const {
    bibleStudyRef,
    handleHoursChange,
    bibleStudies,
    handleBibleStudiesChange,
    bibleStudiesValidator,
    handleSaveReport,
    handleDeleteReport,
    hours_credit_enabled,
    hoursEnabled,
    handleHoursCreditChange,
    hours_credit,
    hoursRef,
    handleSelectPreset,
    handleCheckSelected,
    handleSelectStudy,
    hours_field,
  } = useServiceTime({
    onClose: onSaved,
    date: dateStr,
    // El diálogo original permitía cambiar de fecha desde dentro del propio
    // formulario; aquí el día ya viene fijo (es la fila donde se expandió),
    // así que estos tres solo existen para cumplir el tipo — el hook no los
    // usa para nada más que eso.
    minDate: new Date(dateStr),
    maxDate: new Date(dateStr),
    onDateChange: () => {},
  });

  return (
    <Stack spacing="16px" sx={{ padding: '4px 0 0' }}>
      {hoursEnabled && (
        <FieldContainer ref={hoursRef}>
          <Field sx={{ flexDirection: tabletUp ? 'row' : 'column' }}>
            <Typography sx={{ flex: 1 }}>{t('tr_hours')}</Typography>
            <HoursEditor value={hours_field} onChange={handleHoursChange} hoursLength={2} />
          </Field>

          {hours_credit_enabled && (
            <Field sx={{ flexDirection: tabletUp ? 'row' : 'column' }}>
              <HoursCreditPresets anchorEl={hoursRef} onSelect={handleSelectPreset} />
              <HoursEditor value={hours_credit} onChange={handleHoursCreditChange} hoursLength={2} />
            </Field>
          )}
        </FieldContainer>
      )}

      <FieldContainer
        sx={{ gap: '8px', alignItems: tabletUp ? 'flex-start' : 'center' }}
        ref={bibleStudyRef}
      >
        <Stack
          direction={tabletUp ? 'row' : 'column'}
          sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
        >
          <BibleStudySelector
            anchorEl={bibleStudyRef}
            editable={true}
            handleCheckSelected={handleCheckSelected}
            onChange={handleSelectStudy}
          />

          <StandardEditor
            value={bibleStudies.value}
            onChange={handleBibleStudiesChange}
            validator={bibleStudiesValidator}
          />
        </Stack>
        <BibleStudiesList />
      </FieldContainer>

      <Stack direction="row" spacing="8px">
        {hasExistingReport && (
          <IconButton onClick={handleDeleteReport} color="error">
            <IconDelete color="var(--red-main)" />
          </IconButton>
        )}

        <Button variant="main" onClick={handleSaveReport} sx={{ width: '100%' }}>
          {t('tr_save')}
        </Button>
      </Stack>
    </Stack>
  );
};

export default DayRowEditor;
