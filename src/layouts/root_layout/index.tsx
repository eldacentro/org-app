import { Suspense } from 'react';
import { ScrollRestoration } from 'react-router';
import { Box, Container, Toolbar } from '@mui/material';
import { IconClose } from '@components/icons';
import { AppModalWrapper, WebWorkerWrapper } from '@wrapper/index';
import { Startup } from '@features/app_start';
import { isTest } from '@constants/index';
import useConsoleWarning from '@hooks/useConsoleWarning';
import useCurrentUser from '@hooks/useCurrentUser';
import useGlobal from '@hooks/useGlobal';
import useScrollFocusedInputIntoView from '@hooks/useScrollFocusedInputIntoView';
import useRootLayout from './useRootLayout';
import About from '@features/about';
import AppFeedback from '@features/app_feedback';
import AppReminders from '@features/reminders';
import AppUpdater from '@features/app_updater';
import Contact from '@features/contact';
import DashboardSkeletonLoader from '@features/dashboard/skeleton_loader';
import DemoNotice from '@features/demo/notice';
import DemoStartup from '@features/demo/start';
import EPUBMaterialsImport from '@features/meeting_materials/epub_import';
import InitialSetup from '@features/dashboard/initial_setup';
import JWAutoImport from '@features/meeting_materials/jw_auto_import';
import JWMaterialsImport from '@features/meeting_materials/jw_import';
import MyAssignments from '@features/meetings/my_assignments';
import NavBar from '@layouts/navbar';
import PageTransition from './PageTransition';
import Support from '@features/support';
import UnsupportedBrowser from '@features/app_start/shared/unsupported_browser';
import WaitingLoader from '@components/waiting_loader';

const RootLayout = ({ updatePwa }: { updatePwa: VoidFunction }) => {
  const { isSupported } = useGlobal();

  useConsoleWarning();
  useScrollFocusedInputIntoView();

  const { isPublisher } = useCurrentUser();

  const {
    isAppLoad,
    isOpenAbout,
    isOpenContact,
    isOpenSupport,
    isImportJWOrg,
    isImportEPUB,
    isDashboard,
    initialSetupOpen,
    hasFloatingBottomBar,
  } = useRootLayout();

  if (isSupported && isAppLoad) {
    return (
      <WebWorkerWrapper>
        <AppModalWrapper>
          <AppUpdater updatePwa={updatePwa} />
          {isTest ? <DemoStartup /> : <Startup />}
        </AppModalWrapper>
      </WebWorkerWrapper>
    );
  }

  return (
    <WebWorkerWrapper>
      <AppModalWrapper>
        <NavBar isSupported={isSupported} />
        <AppUpdater updatePwa={updatePwa} />

        <AppFeedback />

        {isImportJWOrg && <JWMaterialsImport />}
        {isImportEPUB && <EPUBMaterialsImport />}

        <JWAutoImport />

        <Box
          className="screen"
          sx={{ position: 'relative', minHeight: '100dvh' }}
        >
          <Box className="glow" />

          <Toolbar
            sx={{
              padding: 0,
              backgroundColor: 'transparent !important',
              backgroundImage: 'none !important',
              boxShadow: 'none !important',
              minHeight: '62px',
            }}
          >
            {/* temporary workaround while page components are being built */}
            <IconClose sx={{ opacity: 0 }} />
          </Toolbar>

          <Container
            maxWidth={false}
            sx={{
              maxWidth: '1440px',
              width: '100%',
              paddingLeft: { mobile: '16px', tablet: '24px', desktop: '32px' },
              paddingRight: { mobile: '16px', tablet: '24px', desktop: '32px' },
              marginTop: '0px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {!isSupported && <UnsupportedBrowser />}

            {isSupported && (
              <>
                {isOpenContact && <Contact />}
                {isOpenAbout && <About updatePwa={updatePwa} />}
                {isOpenSupport && <Support />}

                <Suspense
                  fallback={
                    isDashboard ? (
                      <DashboardSkeletonLoader />
                    ) : (
                      <WaitingLoader type="lottie" />
                    )
                  }
                >
                  {isTest && <DemoNotice />}
                  {!isTest && initialSetupOpen && <InitialSetup />}
                  {isPublisher && <AppReminders />}

                  {/* `aparece-sobre-esqueleto`: cuando el trozo de la página
                      termina de cargarse, lo que había —el esqueleto del
                      Inicio o el cargador— desaparece y esto entra con un
                      fundido corto en vez de aparecer de golpe.

                      Es la regla de Material para los esqueletos: «once
                      content is loaded, it quickly fades in on top of the
                      skeleton loader». Y es el cambio más barato que existe:
                      solo mueve OPACIDAD, que el navegador resuelve sin
                      recalcular ni repintar nada.

                      Va aquí y no en cada página porque todas cuelgan de este
                      único `Suspense`: un sitio, y vale para la app entera. */}
                  <Box
                    className="aparece-sobre-esqueleto"
                    sx={{
                      marginBottom: '32px',
                      paddingBottom: hasFloatingBottomBar
                        ? 'calc(80px + env(safe-area-inset-bottom, 0px))'
                        : 0,
                    }}
                  >
                    <MyAssignments />
                    <PageTransition />
                  </Box>
                </Suspense>
              </>
            )}
          </Container>
        </Box>

        <ScrollRestoration />
      </AppModalWrapper>
    </WebWorkerWrapper>
  );
};

export default RootLayout;
