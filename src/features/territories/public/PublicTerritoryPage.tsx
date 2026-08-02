import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Stack } from '@mui/material';
import { Provider } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import DialogVerTerritorio from '@features/territories/DialogVerTerritorio';
import { construirStorePublico } from './publicTerritoryStore';
import { TerritorySharePayload } from '@definition/territory_shares';
import { fetchPublicShare } from '@services/firebase/territory_shares';
import { SHARE_KEY_LENGTH } from '@services/encryption/share';
import { ParsedShareLink, parseShareHash } from '@services/app/territory_share';
import { FORCED_UI_LANG, LANGUAGE_LIST } from '@constants/index';

/**
 * Página que ve quien abre un enlace compartido de territorio SIN tener cuenta.
 *
 * Se monta fuera de toda la app (ver la bifurcación en `main.tsx`): sin base de
 * datos local, sin sincronización, sin service worker y sin sesión. Lo único
 * que hace es leer un documento de Firestore, descifrarlo con la clave que
 * viene en el fragmento de la URL y pintarlo.
 */

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; payload: TerritorySharePayload }
  | { status: 'error'; kind: 'link' | 'gone' | 'offline' | 'unknown' };

const MESSAGES: Record<
  Extract<LoadState, { status: 'error' }>['kind'],
  { title: string; body: string }
> = {
  link: {
    title: 'Enlace incompleto',
    body: 'Parece que el enlace se cortó al enviarlo. Pide que te lo vuelvan a mandar, copiándolo entero.',
  },
  gone: {
    title: 'Este enlace ya no está activo',
    body: 'Puede que haya caducado, que se haya entregado el territorio o que se haya anulado el enlace. Pide uno nuevo si todavía lo necesitas.',
  },
  offline: {
    title: 'Sin conexión',
    body: 'No se ha podido cargar el territorio. Comprueba tu conexión e inténtalo de nuevo.',
  },
  unknown: {
    title: 'No se ha podido abrir el enlace',
    body: 'Ha ocurrido un problema al cargar el territorio. Vuelve a intentarlo en un momento.',
  },
};

const PublicTerritoryPage = () => {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const link = useRef<ParsedShareLink>(parseShareHash(window.location.hash));
  // React 18 en modo estricto monta dos veces en desarrollo; sin esta guarda
  // se lanzarían dos lecturas al servidor por cada apertura.
  const started = useRef(false);

  const load = useCallback(async () => {
    const parsed = link.current;

    if (!parsed || parsed.keyB64.length !== SHARE_KEY_LENGTH) {
      setState({ status: 'error', kind: 'link' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const payload = await fetchPublicShare(
        parsed.congId,
        parsed.token,
        parsed.keyB64
      );

      // Con el contenido ya descifrado en memoria, la clave sobra en la
      // barra de direcciones. Se borra del hash para que no aparezca en una
      // captura de pantalla ni acabe sincronizada en el historial del
      // navegador del invitado. `replaceState` no recarga ni añade entrada
      // al historial, y `link.current` conserva lo necesario para reintentar.
      try {
        // Se quita SOLO la clave (?k=), conservando `#/t/{congId}/{token}`.
        // Borrando el hash entero, una recarga o un "tirar para refrescar"
        // dejaba de coincidir con la rama pública de main.tsx y al invitado
        // se le montaba la aplicación completa: base de datos local, service
        // worker y una pantalla de acceso de una app en la que no tiene
        // cuenta, sin forma de volver al territorio. Ahora recargar muestra
        // "Enlace incompleto", que es lo correcto y le dice qué hacer.
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}#/t/${parsed.congId}/${parsed.token}`
        );
      } catch {
        // Si el navegador no lo permite, no es motivo para romper la página.
      }

      setState({ status: 'ready', payload });
    } catch (error) {
      const code = (error as { code?: string; message?: string })?.code ?? '';
      const message = (error as Error)?.message ?? '';

      // La regla de seguridad deniega la lectura en cuanto la asignación se
      // cierra o el enlace se anula: para el visitante eso es "ya no vale".
      if (code === 'permission-denied' || message === 'not-found') {
        setState({ status: 'error', kind: 'gone' });
        return;
      }

      if (code === 'unavailable') {
        setState({ status: 'error', kind: 'offline' });
        return;
      }

      // Si el documento sí se leyó pero no descifra, lo más probable es que la
      // clave llegara cortada.
      setState({
        status: 'error',
        kind: /decrypt|operation-specific|Formato/i.test(message)
          ? 'link'
          : 'unknown',
      });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Centered>
        <Typography className="h4" color="var(--ink-2)">
          Cargando territorio…
        </Typography>
      </Centered>
    );
  }

  if (state.status === 'error') {
    const { title, body } = MESSAGES[state.kind];

    return (
      <Centered>
        <Stack spacing="12px" alignItems="center" sx={{ maxWidth: '420px' }}>
          <Typography className="h2" sx={{ textAlign: 'center' }}>
            {title}
          </Typography>
          <Typography
            className="body-regular"
            color="var(--ink-2)"
            sx={{ textAlign: 'center' }}
          >
            {body}
          </Typography>
          {(state.kind === 'offline' || state.kind === 'unknown') && (
            <Button variant="main" onClick={load} sx={{ marginTop: '8px' }}>
              Reintentar
            </Button>
          )}
        </Stack>
      </Centered>
    );
  }

  return <VistaCompartida payload={state.payload} />;
};

/**
 * Idioma con el que se escribe la fecha para el invitado.
 *
 * Aquí no hay sesión ni ajustes de congregación, así que antes se dejaba al
 * navegador (`undefined`). Pero la app está BLOQUEADA a un idioma con
 * `FORCED_UI_LANG` precisamente porque la detección por navegador dejaba a
 * algunos dispositivos en inglés; esta ruta se saltaba ese bloqueo y el enlace
 * salía con «22 July 2026» en medio de una página en español.
 *
 * Si algún día se quita el bloqueo (`FORCED_UI_LANG = null`), esto vuelve a ser
 * `undefined` y manda el navegador, como antes.
 */
const LOCALE_FECHA = LANGUAGE_LIST.find(
  (idioma) => idioma.threeLettersCode === FORCED_UI_LANG
)?.locale;

/** Fecha legible para el invitado. */
const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString(LOCALE_FECHA, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
};

/**
 * LA MISMA VISTA QUE DENTRO DE LA APP.
 *
 * No hay una pantalla «de enlace» y otra «de la app»: el contenido del enlace
 * se traduce a las piezas que la app ya maneja (ver `publicTerritoryStore`) y
 * se monta `DialogVerTerritorio`, el mismo componente que ve un publicador con
 * su cuenta. En modo solo lectura: sin `canManage`, sin editar, sin asignar ni
 * entregar, y sin encender la ubicación por su cuenta —pedirla nada más abrir
 * un enlace que llega por mensajería es justo lo que hace desconfiar; la
 * enciende el invitado desde el botón del propio mapa si quiere.
 *
 * El invitado no tiene a dónde volver, así que cerrar no cierra nada: el
 * diálogo ES la página.
 */
const VistaCompartida = ({ payload }: { payload: TerritorySharePayload }) => {
  const { store, territorio } = useMemo(
    () => construirStorePublico(payload),
    [payload]
  );

  return (
    <Provider store={store}>
      <Box sx={{ minHeight: '100dvh', backgroundColor: 'var(--accent-100)' }}>
        <DialogVerTerritorio
          territory={territorio}
          canManage={false}
          notaInfo={<PieDelEnlace payload={payload} />}
        />
      </Box>
    </Provider>
  );
};

/**
 * Quién comparte, hasta cuándo vale y por qué puede dejar de valer antes.
 *
 * Va al final de la pestaña «Info» y no debajo del mapa: es letra pequeña que
 * se consulta si hace falta. Como pie ocupaba tres líneas grandes debajo del
 * territorio, que es el sitio donde uno quiere ver el mapa.
 */
const PieDelEnlace = ({ payload }: { payload: TerritorySharePayload }) => (
  <Typography
    className="label-small-regular"
    color="var(--ink-3)"
    sx={{
      display: 'block',
      fontSize: '12px',
      lineHeight: 1.45,
      paddingTop: '4px',
    }}
  >
    Enlace compartido por {payload.congName}.
    {payload.expiresAt
      ? ` Válido hasta el ${formatDate(payload.expiresAt)}.`
      : ''}
    {payload.tiedToAssignment
      ? ' Si el territorio se entrega antes, dejará de funcionar en ese momento.'
      : ''}
  </Typography>
);

const Centered = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'var(--accent-100)',
    }}
  >
    {children}
  </Box>
);

export default PublicTerritoryPage;
