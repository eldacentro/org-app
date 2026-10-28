import { useEffect, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import IconLoading from '@components/icon_loading';
import { IconNoConnection } from '@components/icons';
import LogoutConfirm from '@features/my_profile/logout_confirm';
import useFirebaseAuth from '@hooks/useFirebaseAuth';
import useReconexionCuenta from '@hooks/useReconexionCuenta';
import {
  congAccountConnectedState,
  isAppLoadState,
  isOnlineState,
} from '@states/app';
import { accountTypeState, congIDState } from '@states/settings';
import { isTest } from '@constants/index';
import { displaySnackNotification } from '@services/states/app';
import { leerRecargaPorReconexion } from '@services/app/reconectar_cuenta';
import { TEXTO_RESULTADO } from './textos';

/**
 * El aviso de que la cuenta está desconectada, en la pantalla y con qué hacer.
 *
 * Hasta ahora lo único que lo decía era el borde rojo del icono de la cuenta,
 * arriba a la derecha y solo en el Inicio. Nadie lo veía, y quien lo veía no
 * sabía qué significaba ni qué hacer. Mientras tanto, lo que hacía se quedaba
 * en su móvil sin llegar a nadie.
 *
 * Cuándo sale: solo si la cuenta lleva un rato desconectada (15 s). Al abrir
 * la app la cuenta tarda un momento en validarse, y un aviso que aparece y
 * desaparece en cada arranque es exactamente el ruido que hizo quitar el
 * anterior (`sync_status_notice`, que además hablaba de horas sin sincronizar
 * en plena sincronización). Este solo habla de lo que está pasando AHORA.
 *
 * Qué ofrece: lo que de verdad lo arregla en cada caso —reconectar, volver a
 * entrar sin perder nada— y, si eso no basta, cerrar sesión y empezar limpio,
 * que es lo que la gente acababa haciendo a mano borrando la app.
 */
const ESPERA_MS = 15_000;

const AvisoCuentaDesconectada = () => {
  const conectada = useAtomValue(congAccountConnectedState);
  const isAppLoad = useAtomValue(isAppLoadState);
  const isOnline = useAtomValue(isOnlineState);
  const congID = useAtomValue(congIDState);
  const accountType = useAtomValue(accountTypeState);
  const { isAuthenticated, loading: authLoading } = useFirebaseAuth();

  const { intentando, resultado, fallos, reconectar, volverAEntrar } =
    useReconexionCuenta();

  const [visible, setVisible] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // ¿Se acaba de recargar la app para desatascar la reconexión? Se lee una
  // sola vez: sirve para contar cómo ha ido, no para siempre.
  const trasRecargaRef = useRef<boolean | null>(null);
  if (trasRecargaRef.current === null) {
    trasRecargaRef.current = leerRecargaPorReconexion();
  }

  const desconectada = !isTest && !isAppLoad && congID.length > 0 && !conectada;

  useEffect(() => {
    if (!desconectada) {
      setVisible(false);
      return;
    }

    // Tras una recarga para reconectar, si sigue sin conectar se dice antes:
    // la persona está esperando a ver si ha funcionado.
    const reloj = setTimeout(
      () => setVisible(true),
      trasRecargaRef.current ? 6_000 : ESPERA_MS
    );

    return () => clearTimeout(reloj);
  }, [desconectada]);

  // Y si la recarga sí lo arregló, decirlo: si no, quien pulsó «Reconectar»
  // ve la app volver a abrirse y no sabe si ha servido de algo.
  useEffect(() => {
    if (!conectada || !trasRecargaRef.current) return;
    trasRecargaRef.current = false;
    displaySnackNotification({
      header: TEXTO_RESULTADO.conectada.titulo,
      message: TEXTO_RESULTADO.conectada.texto,
      severity: 'success',
    });
  }, [conectada]);

  if (!desconectada || !visible) return null;

  // Qué está pasando, de lo más concreto a lo más general.
  const sinSesion =
    resultado === 'reentrar' ||
    (accountType === 'vip' && !authLoading && !isAuthenticated);
  const sinVinculo = resultado === 'vinculo';
  const sinRed = !isOnline;

  const { titulo, texto } = sinVinculo
    ? TEXTO_RESULTADO.vinculo
    : sinSesion
      ? TEXTO_RESULTADO.reentrar
      : sinRed
        ? {
            titulo: 'Sin internet',
            texto:
              'Lo que hagas se guarda en este dispositivo y se enviará solo en cuanto vuelva la conexión.',
          }
        : resultado === 'servidor'
          ? TEXTO_RESULTADO.servidor
          : {
              titulo: 'Tu cuenta no está conectada',
              texto:
                'Lo que hagas se guarda en este dispositivo, pero no llega a los demás hasta que se conecte. Se sigue intentando solo.',
            };

  // Sin internet no hay nada que pulsar: no es un problema de la cuenta.
  // Se pinta tranquilo, sin el rojo de «algo va mal».
  const tranquilo = sinRed && !sinSesion && !sinVinculo;

  // Si reconectar ya ha fallado dos veces, o ni recargando se ha arreglado,
  // se ofrece la salida de siempre: empezar limpio.
  const ofrecerEmpezarLimpio =
    !sinVinculo && !sinRed && (fallos >= 2 || trasRecargaRef.current === true);

  const handleVolverAEntrar = async () => {
    setEntrando(true);
    await volverAEntrar();
  };

  return (
    <>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          padding: '14px 16px',
          marginTop: '12px',
          marginBottom: '16px',
          borderRadius: 'var(--shape-md)',
          border: tranquilo
            ? '1px solid var(--line)'
            : '1px solid var(--red-secondary)',
          backgroundColor: tranquilo ? 'var(--card)' : 'var(--red-secondary)',
        }}
      >
        <Box sx={{ flexShrink: 0, display: 'flex', pt: '2px' }}>
          <IconNoConnection
            color={tranquilo ? 'var(--ink-2)' : 'var(--red-dark)'}
            width={22}
            height={22}
          />
        </Box>

        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Box>
            <Typography
              className="body-regular-semibold"
              color={tranquilo ? 'var(--ink)' : 'var(--red-dark)'}
            >
              {titulo}
            </Typography>
            <Typography
              className="body-small-regular"
              color={tranquilo ? 'var(--ink-2)' : 'var(--ink)'}
              sx={{ mt: '2px' }}
            >
              {texto}
            </Typography>
          </Box>

          {!tranquilo && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: 'wrap', rowGap: '8px' }}
            >
              {sinVinculo ? (
                <Button
                  variant="main"
                  disableAutoStretch
                  onClick={() => setLogoutOpen(true)}
                >
                  Cerrar sesión
                </Button>
              ) : sinSesion ? (
                <Button
                  variant="main"
                  disableAutoStretch
                  onClick={handleVolverAEntrar}
                  disabled={entrando}
                >
                  {entrando ? 'Abriendo…' : 'Volver a entrar'}
                </Button>
              ) : (
                <Button
                  variant="main"
                  disableAutoStretch
                  onClick={() => reconectar()}
                  disabled={intentando}
                  startIcon={
                    intentando ? (
                      <IconLoading width={18} color="var(--always-white)" />
                    ) : undefined
                  }
                >
                  {intentando
                    ? 'Reconectando…'
                    : resultado
                      ? 'Reintentar'
                      : 'Reconectar ahora'}
                </Button>
              )}

              {/* Un enlace y no otro botón: es la salida de emergencia, no
                  lo primero que hay que probar. */}
              {ofrecerEmpezarLimpio && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  sx={{
                    border: 'none',
                    background: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    '&:focus-visible': {
                      outline: '2px solid var(--accent-main)',
                      outlineOffset: '2px',
                      borderRadius: 'var(--shape-xs)',
                    },
                  }}
                >
                  <Typography
                    className="body-small-semibold"
                    color="var(--red-dark)"
                    sx={{ textDecoration: 'underline' }}
                  >
                    ¿Sigue igual? Cerrar sesión y entrar de nuevo
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      {logoutOpen && (
        <LogoutConfirm open={logoutOpen} onClose={() => setLogoutOpen(false)} />
      )}
    </>
  );
};

export default AvisoCuentaDesconectada;
