import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import IconLoading from '@components/icon_loading';
import { useAppTranslation } from '@hooks/index';
import { MidweekExportType } from './index.types';
import useMidweekExport from './useMidweekExport';
import Button from '@components/button';
import Checkbox from '@components/checkbox';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import S89TemplateSelector from './S89TemplateSelector';
import WeekRangeSelector from '../week_range_selector';
import { useAtomValue } from 'jotai';
import { pdfExportEnabledState } from '@states/settings';
import { sourcesState } from '@states/sources';

const MidweekExport = ({ open, onClose, semanaBase }: MidweekExportType) => {
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const { t } = useAppTranslation();

  const {
    isProcessing,
    handleExportSchedule,
    exportS140,
    exportS89,
    handleToggleS140,
    handleToggleS89,
    S89Template,
    handleSelectS89Template,
    handleSetEndWeek,
    handleSetStartWeek,
  } = useMidweekExport(onClose);

  const sources = useAtomValue(sourcesState);
  const [conSiguiente, setConSiguiente] = useState(false);

  const handleToggleSiguiente = () => setConSiguiente((valor) => !valor);

  // El programa viene YA marcado cuando se entra desde «Programas semanales»:
  // es a lo único que se viene, así que pedir que se marque sobra. Una sola vez
  // por apertura, para no volver a marcarlo si el usuario lo desmarca.
  const sembrado = useRef(false);

  useEffect(() => {
    if (!open) {
      sembrado.current = false;
      return;
    }

    if (!semanaBase || sembrado.current) return;

    sembrado.current = true;
    if (!exportS140) handleToggleS140();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, semanaBase]);

  /** La semana que va justo después de la que se está mirando, si existe. */
  const semanaSiguiente = useMemo(() => {
    if (!semanaBase) return '';

    const semanas = sources
      .map((registro) => registro.weekOf)
      .filter(Boolean)
      .sort();

    const i = semanas.indexOf(semanaBase);

    return i >= 0 ? (semanas[i + 1] ?? '') : '';
  }, [semanaBase, sources]);

  // Sembrar el rango con la semana que se está mirando. Sin esto el diálogo se
  // abriría sin rango y no exportaría nada, porque desde aquí no se enseña el
  // selector de fechas.
  //
  // Las dos funciones de fijar semana se dejan FUERA de las dependencias a
  // propósito: se recrean en cada render y meterlas haría un bucle infinito.
  // Lo que de verdad manda este efecto son las tres de abajo.
  useEffect(() => {
    if (!semanaBase) return;

    handleSetStartWeek(semanaBase);
    handleSetEndWeek(
      conSiguiente && semanaSiguiente ? semanaSiguiente : semanaBase
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanaBase, conSiguiente, semanaSiguiente]);

  return (
    <Dialog
      onClose={onClose}
      open={open}
      sx={{ padding: '24px', position: 'relative' }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '24px',
          flexDirection: 'column',
          width: '100%',
          marginBottom: '110px',
          overflow: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography className="h2">{t('tr_exportMidweekMeeting')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_exportMidweekMeetinDesc')}
          </Typography>
        </Box>

        {/* Desde «Programas semanales» no se elige un rango: se está mirando
            UNA semana y lo único que se quiere decidir es si va también la
            siguiente. Elegir fechas a mano ahí sobra y se equivoca uno.

            Desde la página de edición sigue saliendo el selector de siempre. */}
        {semanaBase ? (
          <Stack spacing="8px">
            {/* Solo el programa. Desde aquí no se sacan las hojitas: quien entra
                por «Programas semanales» viene a imprimir para presidir, no a
                repartir asignaciones — eso se hace desde la página de edición,
                que es donde se sabe a quién le toca cada una. */}
            <Checkbox
              label={t('tr_MMScheduleS140')}
              checked={exportS140}
              onChange={handleToggleS140}
            />

            <Checkbox
              label={t(
                'tr_alsoNextWeek',
                'Incluir también la semana siguiente'
              )}
              checked={conSiguiente}
              onChange={handleToggleSiguiente}
            />

            <Typography
              className="label-small-regular"
              color="var(--grey-400)"
              sx={{ marginLeft: '32px' }}
            >
              {!semanaSiguiente && conSiguiente
                ? t(
                    'tr_noNextWeekAvailable',
                    'No hay semana siguiente guardada: se exportará solo esta.'
                  )
                : t(
                    'tr_alsoNextWeekDesc',
                    'Las dos semanas van en el mismo documento.'
                  )}
            </Typography>
          </Stack>
        ) : (
          <WeekRangeSelector
            meeting="midweek"
            onStartChange={handleSetStartWeek}
            onEndChange={handleSetEndWeek}
          />
        )}

        {/* Una casilla por cosa: se saca lo que se marque, y marcar una no
            arrastra la otra. El botón no se apaga; si no hay nada marcado, lo
            dice al pulsarlo. */}
        {pdfExportEnabled && !semanaBase && (
          <Stack spacing="8px">
            <Checkbox
              label={t('tr_MMScheduleS140')}
              checked={exportS140}
              onChange={handleToggleS140}
            />
            <Checkbox
              label={t('tr_assignmentFormS89')}
              checked={exportS89}
              onChange={handleToggleS89}
            />
          </Stack>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: '500', color: 'var(--grey-400)' }}
          >
            {t('tr_templateS89')}
          </Typography>
          <S89TemplateSelector
            selected={S89Template}
            onChange={(value) => handleSelectS89Template(value)}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          position: 'absolute',
          bottom: 0,
          right: 0,
          padding: '24px',
        }}
      >
        <Button
          variant="main"
          endIcon={isProcessing && <IconLoading />}
          onClick={handleExportSchedule}
        >
          {t('tr_export')}
        </Button>
        <Button variant="tertiary" onClick={onClose}>
          {t('tr_cancel')}
        </Button>
      </Box>
    </Dialog>
  );
};

export default MidweekExport;
