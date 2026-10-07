import { useAtomValue } from 'jotai';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { appThemeState } from '@states/app';
import PublicTerritoryPage from '@features/territories/public/PublicTerritoryPage';
import PaginaInvitacionOrador from '@features/meetings/invitacion_orador/publica';
import '@global/global.css';
import '@global/index.css';
import '@services/firebase/index';

/**
 * Raíz de la app para un VISITANTE que abre un enlace compartido de territorio.
 *
 * Deliberadamente mínima, y por eso no reutiliza `RootWrap`: quien abre un
 * enlace no tiene cuenta ni va a usar la app, así que no debe montársele la
 * base de datos local (Dexie y su pantalla de recuperación si IndexedDB está
 * bloqueado, algo habitual en navegación privada), ni el service worker, ni el
 * arranque de sincronización, ni las traducciones.
 *
 * Sí se reutiliza el tema real de la app (`appThemeState`), que solo depende de
 * localStorage, para que los breakpoints y la tipografía sean los mismos que en
 * el resto de pantallas.
 */
const PublicWrap = () => {
  const theme = useAtomValue(appThemeState);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Dos clases de invitado, y cada una abre lo suyo: `#/t/` es quien
          recibe un territorio compartido y `#/o/` el orador visitante que
          viene a contestar a su carta. */}
      {window.location.hash.startsWith('#/o/') ? (
        <PaginaInvitacionOrador />
      ) : (
        <PublicTerritoryPage />
      )}
    </ThemeProvider>
  );
};

export default PublicWrap;
