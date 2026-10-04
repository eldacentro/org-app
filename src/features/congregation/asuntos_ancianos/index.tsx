import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import Badge from '@components/badge';
import Button from '@components/button';
import Card from '@components/card';
import ConfirmDialog from '@components/confirm_dialog';
import EmptyState from '@components/empty_state';
import IconButton from '@components/icon_button';
import ScrollableTabs from '@components/scrollable_tabs';
import Typography from '@components/typography';
import {
  IconCheckCircle,
  IconDelete,
  IconEdit,
  IconError,
  IconInformationBoard,
} from '@components/icons';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';
import { displaySnackNotification } from '@services/states/app';
import {
  dbAsuntoActualizar,
  dbAsuntoBorrar,
  dbAsuntoCrear,
  dbAsuntoReabrir,
  dbAsuntoTratar,
} from '@services/dexie/asuntos_ancianos';
import { formatDate } from '@utils/date';
import DialogAsunto from './DialogAsunto';
import DialogTratar from './DialogTratar';
import useAsuntosAncianos from './useAsuntosAncianos';

/** «hace 3 días», que es lo que de verdad dice si algo lleva ahí demasiado. */
const desdeHace = (iso: string) => {
  if (!iso) return '';

  const dias = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;

  const meses = Math.floor(dias / 30);

  return meses === 1 ? 'hace un mes' : `hace ${meses} meses`;
};

/**
 * `pedirNuevo` sube de uno en uno cada vez que se pulsa «Apuntar» en la barra
 * de arriba. Es un contador y no un booleano a propósito: pulsar dos veces
 * seguidas tiene que volver a abrir el diálogo, y un `true` que ya era `true`
 * no dispara nada.
 */
const AsuntosAncianos = ({ pedirNuevo = 0 }: { pedirNuevo?: number }) => {
  const {
    cargando,
    pendientes,
    tratados,
    mios,
    sinAsignar,
    nombreDe,
    opcionesAncianos,
    yo,
    pestana,
    setPestana,
  } = useAsuntosAncianos();

  const [editando, setEditando] = useState<AsuntoAncianosType | undefined>();
  const [abrirAsunto, setAbrirAsunto] = useState(false);
  const [tratando, setTratando] = useState<AsuntoAncianosType | undefined>();
  const [borrando, setBorrando] = useState<AsuntoAncianosType | undefined>();
  const [guardando, setGuardando] = useState(false);

  const conAviso = async (accion: () => Promise<void>, hecho: string) => {
    setGuardando(true);

    try {
      await accion();

      displaySnackNotification({
        header: 'Hecho',
        message: hecho,
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Inténtalo de nuevo.',
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardar = async (datos: {
    titulo: string;
    detalle: string;
    asignadoA: string;
    urgente: boolean;
  }) => {
    await conAviso(async () => {
      if (editando) {
        await dbAsuntoActualizar(editando.id, datos);
      } else {
        await dbAsuntoCrear({ ...datos, propuestoPor: yo });
      }
    }, editando ? 'Asunto guardado.' : 'Asunto apuntado.');

    setAbrirAsunto(false);
    setEditando(undefined);
  };

  const handleTratar = async (datos: {
    tratadoPor: string;
    acuerdo: string;
  }) => {
    if (!tratando) return;

    await conAviso(
      () => dbAsuntoTratar(tratando.id, datos),
      'Pasa al historial.'
    );

    setTratando(undefined);
  };

  const abrirNuevo = () => {
    setEditando(undefined);
    setAbrirAsunto(true);
  };

  useEffect(() => {
    if (pedirNuevo > 0) abrirNuevo();
  }, [pedirNuevo]);

  const abrirEdicion = (asunto: AsuntoAncianosType) => {
    setEditando(asunto);
    setAbrirAsunto(true);
  };

  const tarjeta = (asunto: AsuntoAncianosType, enHistorial: boolean) => (
    <Card key={asunto.id} sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography className="h4" color="var(--ink)">
            {asunto.titulo}
          </Typography>

          {asunto.detalle && (
            <Typography className="body-small-regular" color="var(--ink-2)">
              {asunto.detalle}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {!enHistorial && (
            <IconButton onClick={() => abrirEdicion(asunto)}>
              <IconEdit color="var(--accent-main)" />
            </IconButton>
          )}
          <IconButton onClick={() => setBorrando(asunto)}>
            <IconDelete color="var(--red-main)" />
          </IconButton>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: '8px' }}>
        {asunto.urgente && !enHistorial && (
          <Badge size="small" color="red" filled text="Urgente" />
        )}

        {!enHistorial && (
          <Badge
            size="small"
            color={asunto.asignadoA ? 'accent' : 'grey'}
            text={
              asunto.asignadoA
                ? `Responsable: ${nombreDe(asunto.asignadoA)}`
                : 'Sin responsable'
            }
          />
        )}

        {enHistorial && (
          <Badge
            size="small"
            color="green"
            text={`Tratado el ${formatDate(new Date(asunto.tratadoEl), 'dd/MM/yyyy')}`}
          />
        )}
      </Stack>

      {enHistorial && asunto.acuerdo && (
        <Box
          sx={{
            backgroundColor: 'var(--accent-100)',
            borderRadius: 'var(--radius-s)',
            padding: '12px',
          }}
        >
          <Typography className="label-small-semibold" color="var(--ink-3)">
            En qué quedó
          </Typography>
          <Typography className="body-small-regular" color="var(--ink)">
            {asunto.acuerdo}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <Typography className="label-small-regular" color="var(--ink-3)">
          {enHistorial
            ? `Lo trató ${nombreDe(asunto.tratadoPor) || 'el cuerpo de ancianos'}`
            : `Lo apuntó ${nombreDe(asunto.propuestoPor) || 'alguien'} ${desdeHace(asunto.propuestoEl)}`}
        </Typography>

        {enHistorial ? (
          <Button
            variant="small"
            disableAutoStretch
            onClick={() =>
              conAviso(
                () => dbAsuntoReabrir(asunto.id),
                'Vuelve a pendientes.'
              )
            }
          >
            Devolver a pendientes
          </Button>
        ) : (
          <Button
            variant="secondary"
            disableAutoStretch
            onClick={() => setTratando(asunto)}
          >
            Dar por tratado
          </Button>
        )}
      </Box>
    </Card>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* El «contador» que pedía el cuerpo: lo mío, y lo que no es de nadie. */}
      {(mios.length > 0 || sinAsignar > 0) && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: '8px' }}>
          {mios.length > 0 && (
            <Badge
              size="medium"
              color="accent"
              filled
              text={
                mios.length === 1
                  ? 'Eres responsable de 1 asunto'
                  : `Eres responsable de ${mios.length} asuntos`
              }
            />
          )}
          {sinAsignar > 0 && (
            <Badge
              size="medium"
              color="grey"
              text={
                sinAsignar === 1
                  ? '1 sin responsable'
                  : `${sinAsignar} sin responsable`
              }
            />
          )}
        </Stack>
      )}

      <ScrollableTabs
        tabs={[
          { label: `Pendientes (${pendientes.length})` },
          { label: `Tratados (${tratados.length})` },
        ]}
        value={pestana}
        onChange={setPestana}
        variant="scrollable"
        hideScrollButtons
      />

      {pestana === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!cargando && pendientes.length === 0 && (
            <EmptyState
              icon={<IconInformationBoard />}
              title="No hay nada pendiente"
              description="Cuando surja algo que tratar, apúntalo aquí y no se perderá hasta la próxima reunión."
              action={
                <Button variant="main" disableAutoStretch onClick={abrirNuevo}>
                  Apuntar un asunto
                </Button>
              }
            />
          )}

          {pendientes.map((asunto) => tarjeta(asunto, false))}
        </Box>
      )}

      {pestana === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!cargando && tratados.length === 0 && (
            <EmptyState
              icon={<IconCheckCircle />}
              title="Todavía no hay nada tratado"
              description="Lo que se vaya tratando queda aquí, con la fecha y en qué quedó."
            />
          )}

          {tratados.map((asunto) => tarjeta(asunto, true))}
        </Box>
      )}

      <DialogAsunto
        open={abrirAsunto}
        asunto={editando}
        opcionesAncianos={opcionesAncianos}
        guardando={guardando}
        onClose={() => {
          setAbrirAsunto(false);
          setEditando(undefined);
        }}
        onGuardar={handleGuardar}
      />

      <DialogTratar
        open={Boolean(tratando)}
        asunto={tratando}
        opcionesAncianos={opcionesAncianos}
        yo={yo}
        guardando={guardando}
        onClose={() => setTratando(undefined)}
        onTratar={handleTratar}
      />

      <ConfirmDialog
        open={Boolean(borrando)}
        title="Borrar el asunto"
        message={`«${borrando?.titulo ?? ''}» desaparecerá para todos los ancianos. Si ya se trató, es mejor darlo por tratado: así queda en el historial.`}
        confirmLabel="Borrar"
        destructive
        onConfirm={async () => {
          const asunto = borrando;
          setBorrando(undefined);

          if (asunto) {
            await conAviso(() => dbAsuntoBorrar(asunto.id), 'Asunto borrado.');
          }
        }}
        onCancel={() => setBorrando(undefined)}
      />
    </Box>
  );
};

export default AsuntosAncianos;
