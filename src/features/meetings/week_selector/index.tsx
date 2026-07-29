import { Box } from '@mui/material';
import { IconClearMultiple, IconSortDown, IconSortUp } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useWeekSelector from './useWeekSelector';
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
const WeekSelector = () => {
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
  } = useWeekSelector();

  return (
    <CollapsibleSelector
      title={t('tr_meetings')}
      valuePrefix={t('tr_week')}
      valueLabel={selectedWeekDateLocale}
      expanded={expanded}
      onToggle={handleToggleExpand}
      actions={
        <Box
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
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

export default WeekSelector;
