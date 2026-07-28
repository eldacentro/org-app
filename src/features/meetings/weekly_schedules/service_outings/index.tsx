import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { IconInfo } from '@components/icons';
import Typography from '@components/typography';
import useServiceOutingsContainer from './useServiceOutingsContainer';
import ConsejosDialog from './ConsejosDialog';
import NoSchedule from '../no_schedule';
import WeekScheduleHeader from '../week_schedule_header';
import WeekSelector from '../week_selector';
import ServiceOutingsMeeting from './ServiceOutingsMeeting';

const ServiceOutingsContainer = () => {
  const {
    handleGoCurrent,
    handleValueChange,
    value,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    weekRecord,
  } = useServiceOutingsContainer();

  const [consejos, setConsejos] = useState(false);

  return (
    <>
      <ConsejosDialog open={consejos} onClose={() => setConsejos(false)} />

      {/* Los consejos de la Guía sobre cómo dirigir estas reuniones, a mano y
          sin salir del programa: es donde se consultan. Van FUERA del aviso de
          "no hay programa publicado", porque no dependen de que lo haya. */}
      <Box
        component="button"
        type="button"
        onClick={() => setConsejos(true)}
        sx={{
          appearance: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          marginBottom: '12px',
          borderRadius: 'var(--radius-max)',
          border: '1px solid var(--accent-200)',
          backgroundColor: 'var(--accent-100)',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          '&:hover': { backgroundColor: 'var(--accent-200)' },
        }}
      >
        <IconInfo color="var(--accent-main)" width={16} height={16} />
        <Typography
          className="label-small-semibold"
          color="var(--accent-main)"
        >
          Consejos
        </Typography>
      </Box>

      {noSchedule && <NoSchedule />}

      {!noSchedule && (
        <Box
          sx={{
            marginTop: '8px',
          }}
        >
          <WeekSelector value={value} onChange={handleValueChange} />

          <WeekScheduleHeader
            currentVisible={currentWeekVisible}
            week={week}
            onCurrent={handleGoCurrent}
            lastUpdated={scheduleLastUpdated}
          />

          {week && (
            <Stack spacing="24px">
              <ServiceOutingsMeeting week={week} weekRecord={weekRecord} />
            </Stack>
          )}
        </Box>
      )}
    </>
  );
};

export default ServiceOutingsContainer;
