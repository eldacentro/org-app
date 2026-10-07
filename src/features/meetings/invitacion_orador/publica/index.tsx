import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { IconCheckCircle, IconError } from '@components/icons';
import { SpeakerInvitationType } from '@definition/speaker_invitation';
import {
  leerInvitacion,
  responderInvitacion,
} from '@services/firebase/speaker_invitations';

/**
 * LA PÁGINA QUE ABRE EL ORADOR VISITANTE desde el enlace de su carta.
 *
 * Quien llega aquí no tiene cuenta, probablemente está en el móvil y no va a
 * usar la aplicación: entra, lee dos líneas, toca dos botones y se va. Por eso
 * no hay menú, ni sesión, ni nada que instalar, y por eso las preguntas están
 * antes que los detalles — los detalles ya los tiene en la carta.
 *
 * Leer y escribir aquí va contra Firestore directamente (como los enlaces de
 * territorio), no contra la sincronización cifrada: no tiene la clave de la
 * congregación ni debe tenerla.
 */
const PaginaInvitacionOrador = () => {
  const [cargando, setCargando] = useState(true);
  const [invitacion, setInvitacion] = useState<SpeakerInvitationType | null>(
    null
  );

  const [asistira, setAsistira] = useState<boolean | null>(null);
  const [cena, setCena] = useState<boolean | null>(null);
  const [comensales, setComensales] = useState('2');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [fallo, setFallo] = useState(false);

  // `#/o/{congId}/{token}` — todo tras la almohadilla a propósito: el fragmento
  // no viaja al servidor ni en la cabecera `Referer`.
  const [congId, token] = window.location.hash.replace('#/o/', '').split('/');

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!congId || !token) {
        setCargando(false);
        return;
      }

      const dato = await leerInvitacion(congId, token);

      if (cancelado) return;

      setInvitacion(dato);

      if (dato?.respuesta) {
        setAsistira(dato.respuesta.asistira);
        setCena(dato.respuesta.cena);
        setComensales(String(dato.respuesta.comensales || 2));
        setComentario(dato.respuesta.comentario ?? '');
        setEnviado(true);
      }

      setCargando(false);
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [congId, token]);

  const enviar = async () => {
    if (asistira === null || enviando) return;

    setEnviando(true);
    setFallo(false);

    try {
      await responderInvitacion(congId, token, {
        asistira,
        cena: asistira ? cena === true : false,
        comensales: asistira && cena ? Math.max(0, +comensales || 0) : 0,
        comentario,
      });

      setEnviado(true);
    } catch (error) {
      console.error(error);
      setFallo(true);
    } finally {
      setEnviando(false);
    }
  };

  const marco = {
    minHeight: '100dvh',
    backgroundColor: 'var(--accent-150)',
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  };

  const tarjeta = {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--accent-200)',
    boxShadow: 'var(--small-card-shadow)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  if (cargando) {
    return (
      <Box sx={marco}>
        <Box sx={tarjeta}>
          <Typography className="body-regular" color="var(--ink-2)">
            Un momento…
          </Typography>
        </Box>
      </Box>
    );
  }

  // Caducado, anulado o un enlace que no existe: para quien lo abre es lo
  // mismo, y no hay nada que pueda hacer salvo avisar a quien se lo mandó.
  if (!invitacion) {
    return (
      <Box sx={marco}>
        <Box sx={tarjeta}>
          <IconError color="var(--orange-dark)" width={28} height={28} />
          <Typography className="h2" color="var(--ink)">
            Este enlace ya no vale
          </Typography>
          <Typography className="body-regular" color="var(--ink-2)">
            Puede que haya caducado o que la invitación se haya cambiado. Si
            esperabas poder contestar aquí, dilo a quien te mandó la carta.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={marco}>
      <Box sx={tarjeta}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography className="h2" color="var(--ink)">
            {invitacion.speakerName
              ? `Hola, ${invitacion.speakerName}`
              : 'Tu visita'}
          </Typography>
          <Typography className="body-small-regular" color="var(--ink-2)">
            Congregación {invitacion.congName}
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: 'var(--accent-100)',
            borderRadius: 'var(--radius-l)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <Typography className="body-regular-semibold" color="var(--ink)">
            {invitacion.dateLocale}
            {invitacion.time ? ` · ${invitacion.time}` : ''}
          </Typography>
          {invitacion.talkTitle ? (
            <Typography className="body-small-regular" color="var(--ink-2)">
              {invitacion.talkNumber ? `N.º ${invitacion.talkNumber} · ` : ''}
              {invitacion.talkTitle}
            </Typography>
          ) : null}
          {invitacion.congAddress ? (
            <Typography className="label-small-regular" color="var(--ink-3)">
              {invitacion.congAddress}
            </Typography>
          ) : null}
        </Box>

        {enviado ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <IconCheckCircle color="var(--green-main)" width={28} height={28} />
            <Typography className="h4" color="var(--ink)">
              Gracias, ya lo tenemos
            </Typography>
            <Typography className="body-small-regular" color="var(--ink-2)">
              {asistira === false
                ? 'Hemos anotado que no podrás venir.'
                : cena
                  ? `Te esperamos, y contamos con ${comensales} para la cena.`
                  : 'Te esperamos. Hemos anotado que no os quedáis a cenar.'}
            </Typography>
            <Button
              variant="tertiary"
              disableAutoStretch
              onClick={() => setEnviado(false)}
              sx={{ alignSelf: 'flex-start', marginTop: '8px' }}
            >
              Cambiar mi respuesta
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Typography className="body-regular-semibold" color="var(--ink)">
                ¿Podrás venir?
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={asistira === true ? 'main' : 'secondary'}
                  disableAutoStretch
                  onClick={() => setAsistira(true)}
                >
                  Sí, allí estaré
                </Button>
                <Button
                  variant={asistira === false ? 'main' : 'secondary'}
                  disableAutoStretch
                  onClick={() => setAsistira(false)}
                >
                  No podré
                </Button>
              </Stack>
            </Box>

            {asistira === true && (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <Typography className="body-regular-semibold" color="var(--ink)">
                  ¿Os quedáis a cenar?
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={cena === true ? 'main' : 'secondary'}
                    disableAutoStretch
                    onClick={() => setCena(true)}
                  >
                    Sí
                  </Button>
                  <Button
                    variant={cena === false ? 'main' : 'secondary'}
                    disableAutoStretch
                    onClick={() => setCena(false)}
                  >
                    No, gracias
                  </Button>
                </Stack>

                {cena === true && (
                  <TextField
                    label="¿Cuántos seréis en total?"
                    type="number"
                    value={comensales}
                    onChange={(e) => setComensales(e.target.value)}
                    sx={{ maxWidth: '200px' }}
                  />
                )}
              </Box>
            )}

            {asistira !== null && (
              <TextField
                label="¿Quieres decirnos algo más? (opcional)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, 300))}
                multiline
                rows={2}
              />
            )}

            {fallo && (
              <Typography className="body-small-regular" color="var(--red-main)">
                No se ha podido enviar. Comprueba tu conexión e inténtalo otra
                vez.
              </Typography>
            )}

            <Button
              variant="main"
              disabled={asistira === null || enviando}
              onClick={enviar}
            >
              {enviando ? 'Enviando…' : 'Enviar respuesta'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default PaginaInvitacionOrador;
