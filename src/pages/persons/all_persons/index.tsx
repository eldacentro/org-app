import { Box, Slide } from '@mui/material';
import { Button, PageTitle } from '@components/index';
import {
  IconAddPerson,
  IconFilter,
  IconImportExport,
  IconPanelClose,
  IconPanelOpen,
} from '@components/icons';
import ButtonIcon from '@components/icon_button';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import useAllPersons from './useAllPersons';

import PersonsList from '@features/persons/list';
import PersonsFilter from '@features/persons/filter';
import PersonsSearch from '@features/persons/search';
import NavBarButton from '@components/nav_bar_button';
import ImportExport from '@features/persons/import_export';

/**
 * El buscador y el acceso a los filtros, en una fila.
 *
 * Estaba escrito DOS veces —una para escritorio y otra para lo demás— con el
 * buscador suelto en un flex, sin `flex: 1` ni `minWidth: 0`: encogía hasta
 * cortar su propio texto («Buscar por n…») para dejarle sitio a la palabra
 * «Filtros», que se usa mucho menos que buscar.
 *
 * En pantalla estrecha la palabra se va y se queda el icono, con el nombre en
 * la etiqueta para quien use lector de pantalla. Es el mismo remedio, y por el
 * mismo motivo, que el botón «Gestionar» de Territorios.
 */
const SearchRow = ({
  isPanelOpen,
  onToggle,
}: {
  isPanelOpen: boolean;
  onToggle: VoidFunction;
}) => {
  const { t } = useAppTranslation();

  const { tablet600Up } = useBreakpoints();

  return (
    <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      {/* `minWidth: 0` es lo que le permite encoger de verdad: sin él, el
          contenido mínimo del campo manda y quien cede es el vecino. */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <PersonsSearch />
      </Box>

      {tablet600Up ? (
        <Button
          variant="secondary"
          onClick={onToggle}
          endIcon={isPanelOpen ? <IconPanelOpen /> : <IconPanelClose />}
          disableAutoStretch
          sx={{ flexShrink: 0 }}
        >
          {t('tr_filters')}
        </Button>
      ) : (
        // 56px, el mismo alto que el buscador y con el mismo radio: al lado se
        // leen como una pareja y no como dos piezas de sitios distintos. Y con
        // el MISMO relleno, no con un aro alrededor: el buscador es una píldora
        // rellena y sin canto, así que el anillo hacía del icono una pieza de
        // otra familia (§6.4b: relleno, no canto).
        <ButtonIcon
          onClick={onToggle}
          aria-label={t('tr_filters')}
          sx={{
            flexShrink: 0,
            width: '56px',
            height: '56px',
            backgroundColor: 'var(--grey-100)',
          }}
        >
          <IconFilter color="var(--accent-dark)" />
        </ButtonIcon>
      )}
    </Box>
  );
};

const PersonsAll = () => {
  const { t } = useAppTranslation();

  const { desktopUp } = useBreakpoints();

  const { isPersonEditor } = useCurrentUser();

  const {
    handlePersonAdd,
    isPanelOpen,
    setIsPanelOpen,
    handleOpenExchange,
    isDataExchangeOpen,
    handleCloseExchange,
  } = useAllPersons();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
      }}
    >
      <PageTitle
        title={t('tr_personsAll')}
        buttons={
          isPersonEditor && (
            <>
              <NavBarButton
                text={t('tr_importExport')}
                main={false}
                icon={<IconImportExport />}
                onClick={handleOpenExchange}
              ></NavBarButton>
              <NavBarButton
                text={t('tr_btnAdd')}
                main
                icon={<IconAddPerson />}
                onClick={handlePersonAdd}
              ></NavBarButton>
            </>
          )
        }
      />

      <ImportExport
        key={isDataExchangeOpen ? 'open' : 'closed'}
        open={isDataExchangeOpen}
        onClose={handleCloseExchange}
      />
      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}
      >
        {desktopUp && (
          <Box
            sx={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              flex: 1,
              borderRadius: 'var(--shape-xl)',
              padding: '20px',
              display: 'flex',
              gap: '16px',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <SearchRow
              isPanelOpen={isPanelOpen}
              onToggle={() => setIsPanelOpen((prev) => !prev)}
            />

            <PersonsList />
          </Box>
        )}

        {!desktopUp && (
          <Box sx={{ position: 'relative', overflowX: 'clip', width: '100%' }}>
            <Slide direction="right" in={!isPanelOpen} unmountOnExit>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  paddingBottom: '32px',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--line)',
                    flex: 1,
                    borderRadius: 'var(--shape-xl)',
                    padding: '20px',
                    display: 'flex',
                    gap: '16px',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <SearchRow
                    isPanelOpen={isPanelOpen}
                    onToggle={() => setIsPanelOpen((prev) => !prev)}
                  />

                  <PersonsList />
                </Box>
              </Box>
            </Slide>

            <Slide direction="left" in={isPanelOpen} unmountOnExit>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  paddingBottom: '32px',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--shape-xl)',
                    padding: '20px',
                    width: '100%',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <PersonsFilter />
                </Box>
              </Box>
            </Slide>
          </Box>
        )}

        {desktopUp && isPanelOpen && (
          <Box
            sx={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--shape-xl)',
              padding: '20px',
              width: '520px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <PersonsFilter />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PersonsAll;
