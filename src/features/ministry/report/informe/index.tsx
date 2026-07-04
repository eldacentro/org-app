import { Stack } from '@mui/material';
import useInforme from './useInforme';
import ViewSwitcher from './view_switcher';
import YearView from './year_view';
import MonthView from './month_view';
import DayView from './day_view';
import DelegateReports from '@features/ministry/delegate_reports';
import MonthlyReport from '@features/ministry/report/publisher_report/monthly_report';

/**
 * "Informe de predicación" — unifica lo que antes eran dos páginas
 * separadas (Informe + Año de servicio).
 *
 * Un publicador normal (nunca ha sido precursor) ve solo el formulario
 * mensual simple — `MonthlyReport` ya oculta las horas por sí solo cuando
 * la persona no es precursora ese mes (`useFormS4`'s `isHourEnabled`), así
 * que no hace falta un formulario aparte: es exactamente el flujo simple
 * que se pidió, reutilizado tal cual.
 *
 * Alguien que ha sido precursor alguna vez ve además el selector Día/Mes/
 * Año — las tres vistas ya son las finales.
 */
const Informe = () => {
  const { isPioneer, activeView, setActiveView } = useInforme();

  return (
    <Stack spacing="24px">
      {!isPioneer && <MonthlyReport />}

      {isPioneer && (
        <>
          <ViewSwitcher value={activeView} onChange={setActiveView} />

          {activeView === 'year' && <YearView />}

          {activeView === 'month' && (
            <MonthView onSelectDay={() => setActiveView('day')} />
          )}

          {activeView === 'day' && <DayView />}
        </>
      )}

      <DelegateReports />
    </Stack>
  );
};

export default Informe;
