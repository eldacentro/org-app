import { Box } from '@mui/material';
import { IconClearMultiple, IconSortDown, IconSortUp } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useWeekPickerPanel from './useWeekPickerPanel';
import AssignmentsDelete from '../assignments_delete';
import Button from '@components/button';
import CollapsibleSelector from '@components/collapsible_selector';
import ScrollableTabs from '@components/scrollable_tabs';

/**
 * Elegir semana en los editores de reunión.
 *
 * El aspecto y el plegado los pone `CollapsibleSelector`, el mismo que usan
 * Departamentos y los selectores de mes. Aquí queda solo lo propio de esta
 * pantalla: ordenar y borrar asignaciones en bloque.
 */
const WeekPickerPanel = () => {
  const { t } = useAppTranslation();

  const {
    tabs,
    hasWeeks,
    expanded,
    handleToggleExpand,
    activeTab,
    handleCloseDelete,
    openDelete,
    handleOpenDelete,
    meeting,
    sortDown,
    handleToggleSort,
    selectedWeekDateLocale,
  } = useWeekPickerPanel();

  return (
    <CollapsibleSelector
      // El rótulo del panel dice QUÉ se está eligiendo, y aquí se eligen
      // semanas: dentro no hay más que la lista de semanas del año. Decía
      // "Reuniones" —el nombre de la sección, no el del control— mientras el
      // de Departamentos, que es el mismo panel con la misma lista, decía
      // "Semanas".
      title={t('tr_weeks', 'Semanas')}
      valuePrefix={t('tr_week')}
      valueLabel={selectedWeekDateLocale}
      expanded={expanded}
      onToggle={handleToggleExpand}
      actions={
        <Box
          component="button"
          type="button"
          // Botón de verdad, y que dice lo que hace: era un `Box` con
          // `onClick` y un icono dentro, o sea un control mudo al que no se
          // llegaba tabulando y que un lector de pantalla no anunciaba.
          aria-label={
            sortDown
              ? 'Ordenar las semanas de la más reciente a la más antigua'
              : 'Ordenar las semanas de la más antigua a la más reciente'
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            appearance: 'none',
            background: 'none',
            border: 'none',
            padding: 0,
            // El icono se dibuja a 24 y el objetivo tiene que ser 48. Con un
            // `::after` invisible para no mover la cabecera del panel, que
            // comparte línea con el título y el chevrón de plegar.
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: '-12px',
            },
            '&:focus-visible': {
              outline: '2px solid var(--accent-main)',
              outlineOffset: '2px',
              borderRadius: 'var(--shape-xs)',
            },
          }}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleSort();
          }}
        >
          {sortDown ? (
            <IconSortDown color="var(--black)" />
          ) : (
            <IconSortUp color="var(--black)" />
          )}
        </Box>
      }
    >
      {openDelete && (
        <AssignmentsDelete
          meeting={meeting}
          open={openDelete}
          onClose={handleCloseDelete}
        />
      )}

      {hasWeeks && <ScrollableTabs tabs={tabs} value={activeTab} />}

      {hasWeeks && (
        <Box sx={{ display: 'flex', marginTop: '16px' }}>
          <Button
            variant="small"
            startIcon={<IconClearMultiple height={20} width={20} />}
            sx={{ height: '32px', minHeight: '32px' }}
            color="red"
            onClick={handleOpenDelete}
          >
            {t('tr_assignmentsDeleteMultiple')}
          </Button>
        </Box>
      )}
    </CollapsibleSelector>
  );
};

export default WeekPickerPanel;
