import { Box, MenuItem } from '@mui/material';
import Button from '@components/button';
import Select from '@components/select';
import PanelToolbar from '@components/panel_toolbar';
import TalksListView from './listView';
import TalksTableView from './tableView';
import Typography from '@components/typography';
import usePublicTalks from './usePublicTalks';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { IconCollapse, IconExpand } from '@components/icons';
import { PublicTalksType } from './index.types';

const PublicTalks = ({ view }: PublicTalksType) => {
  const { t } = useAppTranslation();

  const { laptopUp } = useBreakpoints();

  const {
    talks,
    talksSorted,
    sortOptions,
    sortValue,
    handleSortChange,
    handleToggleExpandAll,
    isExpandAll,
    handleSearch,
    labelSearch,
    txtSearch,
  } = usePublicTalks();

  const getTableHeight = () => {
    let height: string;

    if (laptopUp) {
      height = '80vh';
    }

    if (!laptopUp) {
      height = '75vh';
    }

    return height;
  };

  return (
    // La barra FUERA de la tarjeta de la lista, no dentro: las dos son
    // tarjetas con el mismo fondo y el mismo canto, y una dentro de otra es el
    // doble anidado que prohíbe el sistema de diseño (§8). Fuera queda además
    // igual que Discursos salientes y que el catálogo de oradores: barra
    // arriba, resultados debajo.
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Buscar y ordenar, en la MISMA fila: las dos son la misma pregunta
          —cómo encuentro lo que busco— y se responden antes de mirar la lista.

          Y en la misma barra que Discursos salientes, el catálogo de oradores
          y las pestañas de Territorios. Aquí ya decía que era «la misma pareja
          con las mismas medidas» que Discursos salientes; ahora además es el
          mismo componente, así que no pueden volver a separarse sin que se note.

          En un móvil no caben al lado y el desplegable baja a su propia línea
          a lo ancho, que es donde se deja pulsar sin apuntar. */}
      <PanelToolbar
        busqueda={txtSearch}
        onBuscar={handleSearch}
        placeholder={t('tr_search')}
        accion={
          view === 'list' ? (
            <Select
              label="Ordenar por"
              value={sortValue}
              onChange={(event) =>
                handleSortChange(event.target.value as string)
              }
              sx={{ width: { mobile: '100%', tablet600: '240px' } }}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Typography>{option.label}</Typography>
                </MenuItem>
              ))}
            </Select>
          ) : null
        }
      />

      <Box
        sx={{
          border: '1px solid var(--line)',
          borderRadius: 'var(--shape-xl)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--card)',
          height: getTableHeight(),
          minHeight: 0,
        }}
      >

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <Typography className="h2">
          {t(labelSearch, { count: talks.length })}
        </Typography>

        <>
          {view === 'list' && laptopUp && (
            <Button
              variant="small"
              startIcon={
                isExpandAll ? (
                  <IconCollapse
                    height={22}
                    width={22}
                    color="var(--accent-main)"
                  />
                ) : (
                  <IconExpand
                    height={22}
                    width={22}
                    color="var(--accent-main)"
                  />
                )
              }
              onClick={handleToggleExpandAll}
            >
              {isExpandAll ? t('tr_collapseAll') : t('tr_expandAll')}
            </Button>
          )}
        </>
      </Box>

      {view === 'list' && (
        <TalksListView talks={talksSorted} isExpandAll={isExpandAll} />
      )}

      {view === 'table' && <TalksTableView talks={talks} />}
      </Box>
    </Box>
  );
};

export default PublicTalks;
