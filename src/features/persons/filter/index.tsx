import { Box } from '@mui/material';
import Button from '@components/button';
import CustomDivider from '@components/divider';
import Typography from '@components/typography';
import { IconDelete } from '@components/icons';
import FilterGroup from './filter_group';
import { useAppTranslation, useBreakpoints, useCurrentUser } from '@hooks/index';
import useFilter from './useFilter';
import AssignmentGroup from '../assignment_group';
import Tabs from '@components/tabs';
import TabLabel from '@components/tab_label_with_badge';

const PersonsFilter = () => {
  const { t } = useAppTranslation();

  const { tabletDown, mobile400Down, desktopUp } = useBreakpoints();

  const { isPersonEditor } = useCurrentUser();

  const {
    filters,
    handleClearFilters,
    assignments,
    handleToggleGroup,
    filterGroups,
    handleToggleAssignment,
    checkedItems,
    handleCloseFilterMobile,
    handleOpenTrash,
    trashCount,
  } = useFilter();

  const tabs = [
    {
      label: (
        <TabLabel
          count={filters.length - checkedItems.length}
          label={t('tr_categories')}
        />
      ),
      Component: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
            width: '100%',
            minWidth: '120px',
          }}
        >
          {filterGroups.map((group) => (
            <FilterGroup
              key={group.name}
              group={{
                name: group.name,
                items: group.items,
              }}
            />
          ))}
        </Box>
      ),
    },
    {
      label: (
        <TabLabel count={checkedItems.length} label={t('tr_assignments')} />
      ),
      Component: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            width: '100%',
            minWidth: '150px',
          }}
        >
          <Typography className="body-small-semibold" color="var(--grey-350)">
            {t('tr_assignments')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: tabletDown ? '1fr' : 'repeat(2, 1fr)',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            {assignments.map((assignment) => (
              <AssignmentGroup
                sx={{ width: '100%' }}
                key={assignment.id}
                id={assignment.id}
                header={assignment.header}
                color={assignment.color}
                items={assignment.items}
                onHeaderChange={handleToggleGroup}
                onItemChange={handleToggleAssignment}
                checkedItems={checkedItems}
                male={true}
              />
            ))}
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <Typography className="h4">{t('tr_filters')}</Typography>
        {filters.length > 0 && (
          <Box
            sx={{
              borderRadius: 'var(--shape-xs)',
              padding: '4px 8px',
              backgroundColor: 'var(--line)',
            }}
          >
            <Typography className="label-small-medium">
              {t('tr_amountApplied', { amount: filters.length })}
            </Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginTop: '16px',
          justifyContent: 'space-between',
          flexDirection: tabletDown ? 'column' : 'row',
        }}
      >
        <Tabs tabs={tabs} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '8px',
          height: '48px',
          gap: '8px',
          flexDirection: mobile400Down ? 'column' : 'row',
          padding: mobile400Down ? '42px 0' : 'unset',
        }}
      >
        {!desktopUp && (
          <Button variant="main" onClick={handleCloseFilterMobile}>
            {t('tr_search')}
          </Button>
        )}

        <Button variant="secondary" onClick={handleClearFilters}>
          {t('tr_clearAll')}
        </Button>
      </Box>

      {/* LA PAPELERA, aquí abajo.
          No es un filtro, y por eso va detrás de una línea y del bloque de
          botones en vez de mezclada con las categorías. Estuvo como pestaña de
          Personas y luego en la cabecera de la página, y en los dos sitios
          pesaba demasiado para algo que se abre unas pocas veces al año: este
          panel se despliega solo cuando alguien lo busca, que es exactamente
          la atención que merece.

          Se enseña aunque esté vacía —con su cero— porque estando escondida
          aquí lo caro no es el sitio que ocupa, sino no encontrarla el día que
          hace falta. */}
      {isPersonEditor && (
        <>
          <CustomDivider color="var(--line)" />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginTop: '12px',
            }}
          >
            <Typography className="body-small-regular" color="var(--ink-3)">
              {t('tr_deletedPersons')}
            </Typography>

            <Button
              variant="secondary"
              startIcon={<IconDelete color="var(--accent-main)" />}
              onClick={handleOpenTrash}
              disableAutoStretch
            >
              {`${t('tr_trash')} (${trashCount})`}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PersonsFilter;
