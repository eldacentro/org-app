import { Box, MenuItem } from '@mui/material';
import Button from '@components/button';
import Select from '@components/select';
import SearchBar from '@components/search_bar';
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
      }}
    >
      {/* Buscar y ordenar, en la MISMA fila: las dos son la misma pregunta
          —cómo encuentro lo que busco— y se responden antes de mirar la lista.
          Es la misma pareja, y con las mismas medidas, que Discursos
          salientes.

          En un móvil no caben al lado y el desplegable baja a su propia línea
          a lo ancho, que es donde se deja pulsar sin apuntar. Colgado a la
          derecha del contador, como estuvo un rato, dejaba un hueco muerto
          debajo del título y el texto no le cabía en la caja. */}
      <Box sx={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 240px', minWidth: '200px' }}>
          <SearchBar
            placeholder={t('tr_search')}
            value={txtSearch}
            onSearch={handleSearch}
          />
        </Box>

        {view === 'list' && (
          <Select
            label="Ordenar por"
            value={sortValue}
            onChange={(event) => handleSortChange(event.target.value as string)}
            sx={{
              width: { mobile: '100%', tablet600: '240px' },
              flexShrink: 0,
            }}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Typography>{option.label}</Typography>
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>

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
  );
};

export default PublicTalks;
