import { Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router';
import { IconImportFile } from '@components/icons';
import WeekSelector from '../week_selector';
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
      />

      {/* Los documentos de exhibidores, a un toque desde donde se consulta el
          turno. Se enlaza por NOMBRE de categoría: el id se genera al crearla y
          no vale para escribirlo en un enlace. */}
      <Box
        component="button"
        type="button"
        onClick={() =>
          navigate('/congregation/documentos?categoria=Exhibidores')
        }
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
        <IconImportFile color="var(--accent-main)" width={16} height={16} />
        <Typography className="label-small-semibold" color="var(--accent-main)">
          Documentos de exhibidores
        </Typography>
      </Box>

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
            borderRadius: 'var(--r-lg)',
            marginTop: '16px',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ color: 'var(--grey-400)', fontSize: '14px', fontWeight: '500' }}>
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
