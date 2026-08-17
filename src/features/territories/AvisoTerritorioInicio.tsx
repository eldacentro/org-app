import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import { Box, Stack } from '@mui/material';
import Typography from '@components/typography';
import Button from '@components/button';
import { IconError } from '@components/icons';
import { myUnreadNoticesState } from '@states/territories';
import { AVISO_ATRASADO_TITULO } from '@services/app/territories';

/**
 * El aviso de territorio ATRASADO del publicador, en la primera pantalla.
 *
 * Un aviso de "territorio atrasado" ya llegaba por tres sitios: la campanita
 * —que se llena sola aunque no se entre nunca en Territorios—, un push al
 * teléfono, y una tira dentro de "Mis territorios". Aun así se le puede
 * escapar a quien no mire la campanita o tenga los avisos del móvil apagados,
 * y entonces el responsable se queda esperando una respuesta que no llega.
 *
 * Esto lo pone donde no hay que ir a buscarlo: en el panel de inicio, encima
 * de todo, la primera vez que abre la aplicación. No se descarta desde aquí a
 * propósito — se va cuando el aviso se atiende o se descarta en "Mis
 * territorios", que es donde además está el botón de entregar. Un botón de
 * cerrar aquí lo convertiría en una mosca que se espanta sin leerla.
 *
 * Y no se pinta si no hay nada: quien esté al día no ve absolutamente nada
 * nuevo en su inicio.
 */
const AvisoTerritorioInicio = () => {
  const navigate = useNavigate();
  const todos = useAtomValue(myUnreadNoticesState);

  // SOLO los territorios atrasados del propio publicador.
  //
  // Los avisos de responsable —"X devolvió el 12 sin trabajar", "X añadió una
  // dirección"— también van dirigidos a una persona, así que caían aquí y le
  // salían al responsable en su inicio. Ahí no pintan nada: no hay que hacer
  // nada con ellos, para eso está la campanita. El inicio se reserva para lo
  // único que de verdad reclama algo de quien abre la aplicación.
  const avisos = todos.filter((n) => n.title === AVISO_ATRASADO_TITULO);

  if (avisos.length === 0) return null;

  // De uno en uno. Con dos avisos a la vez, dos tiras rojas seguidas en el
  // inicio son un muro; se anuncia el primero y el resto se ven de un tirón
  // al entrar.
  const aviso = avisos[0];
  const restantes = avisos.length - 1;

  const abrir = () => {
    navigate(
      aviso.territoryId
        ? `/congregation/territories?view=${aviso.territoryId}`
        : '/congregation/territories'
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { mobile: 'column', tablet600: 'row' },
        alignItems: { mobile: 'stretch', tablet600: 'center' },
        gap: '12px',
        padding: '16px',
        marginBottom: '16px',
        borderRadius: 'var(--shape-lg)',
        border: '1px solid var(--orange-main)',
        backgroundColor: 'var(--orange-secondary)',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        sx={{ flex: 1, minWidth: 0 }}
      >
        <Box sx={{ flexShrink: 0, display: 'flex', marginTop: '2px' }}>
          <IconError color="var(--orange-dark)" width={22} height={22} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography className="body-regular-semibold" color="var(--ink)">
            {aviso.title || 'Aviso de territorio'}
          </Typography>
          <Typography className="body-small-regular" color="var(--ink-2)">
            {aviso.mensaje}
          </Typography>
          {restantes > 0 && (
            <Typography
              className="label-small-regular"
              color="var(--ink-3)"
              sx={{ marginTop: '4px' }}
            >
              {restantes === 1
                ? 'Y otro aviso más.'
                : `Y otros ${restantes} avisos más.`}
            </Typography>
          )}
        </Box>
      </Stack>
      <Button variant="main" onClick={abrir} disableAutoStretch>
        Ver mis territorios
      </Button>
    </Box>
  );
};

export default AvisoTerritorioInicio;
