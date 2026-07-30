import { Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router';
import { IconImportFile } from '@components/icons';
import WeekSelector from '../week_selector';
import Accion from '../week_schedule_header/Accion';
import WeekScheduleHeader from '../week_schedule_header';
import useExhibitorsContainer from './useExhibitorsContainer';
import ExhibitorsMeeting from './ExhibitorsMeeting';
import Typography from '@components/typography';

const ExhibitorsWeeklyContainer = () => {
  const {
    value,
    handleGoCurrent,
    handleValueChange,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    weekRecord,
    filteredSources,
  } = useExhibitorsContainer();

  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%' }}>
      <WeekSelector
        value={value}
        onChange={handleValueChange}
        customWeeksList={filteredSources}
      />

      {/* Antes esta pestaña no mostraba el rango de semana, ni el botón
          "ir a la semana actual", ni "última actualización" — currentWeekVisible/
          onGoCurrent/scheduleLastUpdated se pasaban a WeekSelector, cuyo tipo
          nunca los declara, así que se descartaban en silencio. Igual que
          Departamentos y Salidas de predicación. */}
      <WeekScheduleHeader
        currentVisible={currentWeekVisible}
        week={week}
        onCurrent={handleGoCurrent}
        lastUpdated={scheduleLastUpdated}
        action={
          <Accion
            icono={
              <IconImportFile
                color="var(--always-white)"
                width={16}
                height={16}
              />
            }
            texto="Documentos"
            onClick={() =>
              navigate('/congregation/documentos?categoria=Exhibidores')
            }
          />
        }
      />

      {week === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : noSchedule ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '24px',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--shape-xl)',
            marginTop: '16px',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              color: 'var(--grey-400)',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            No hay programa de exhibidores para esta semana.
          </Typography>
        </Box>
      ) : (
        <ExhibitorsMeeting weekRecord={weekRecord} week={week as string} />
      )}
    </Box>
  );
};

export default ExhibitorsWeeklyContainer;
