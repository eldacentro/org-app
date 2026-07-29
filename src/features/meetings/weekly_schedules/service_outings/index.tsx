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

          {/* Al FINAL y centrado: los consejos son una consulta puntual de
              quien dirige la reunión, no algo que haya que sortear cada vez
              que se entra a ver el programa. */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '28px',
              marginBottom: '8px',
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => setConsejos(true)}
              sx={{
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-max)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': { backgroundColor: 'var(--accent-100)' },
              }}
            >
              <IconInfo color="var(--accent-main)" width={18} height={18} />
              <Typography
                className="body-small-semibold"
                color="var(--accent-main)"
              >
                Consejos para dirigir la reunión
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ServiceOutingsContainer;
