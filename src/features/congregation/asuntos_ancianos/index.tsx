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
import { DIAS_EN_ARCHIVO } from '@services/app/necesidades';
import { formatDate } from '@utils/date';
import DialogAsunto, { DatosNecesidad } from './DialogAsunto';
import useAsuntosAncianos from './useAsuntosAncianos';

/** 'YYYY/MM/DD' → 'DD/MM/YYYY', sin pasar por Date (no la mueve la zona). */
const fechaLegible = (texto: string) => texto.split('/').reverse().join('/');

const MESES_EN_ARCHIVO = Math.round(DIAS_EN_ARCHIVO / 30);

/**
 * NECESIDADES DE LA CONGREGACIÓN.
 *
 * Antes era «Asuntos del cuerpo de ancianos», con responsable, urgencia,
 * contadores, quién lo trató y en qué quedó. Se quedó en lo que de verdad se
 * usa: el tema, algún detalle, a quién le podría tocar y una fecha posible.
 * Cuando se trata, pasa al archivo con un toque, y el archivo se vacía solo.
 *
 * `pedirNuevo` sube de uno en uno cada vez que se pulsa «Apuntar» en la barra
 * de arriba. Es un contador y no un booleano a propósito: pulsar dos veces
 * seguidas tiene que volver a abrir el diálogo, y un `true` que ya era `true`
 * no dispara nada.
 */
const AsuntosAncianos = ({ pedirNuevo = 0 }: { pedirNuevo?: number }) => {
  const {
    cargando,
    pendientes,
    archivo,
    nombreDe,
    opcionesPersonas,
    yo,
    pestana,
    setPestana,
  } = useAsuntosAncianos();

  const [editando, setEditando] = useState<AsuntoAncianosType | undefined>();
  const [abrirAsunto, setAbrirAsunto] = useState(false);
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

  const handleGuardar = async (datos: DatosNecesidad) => {
    await conAviso(async () => {
      if (editando) {
        await dbAsuntoActualizar(editando.id, datos);
      } else {
        await dbAsuntoCrear({ ...datos, propuestoPor: yo });
      }
    }, editando ? 'Necesidad guardada.' : 'Necesidad apuntada.');

    setAbrirAsunto(false);
    setEditando(undefined);
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

  const tarjeta = (asunto: AsuntoAncianosType, enArchivo: boolean) => (
    <Card
      key={asunto.id}
      sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
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
          {!enArchivo && (
            <IconButton onClick={() => abrirEdicion(asunto)}>
              <IconEdit color="var(--accent-main)" />
            </IconButton>
          )}
          <IconButton onClick={() => setBorrando(asunto)}>
            <IconDelete color="var(--red-main)" />
          </IconButton>
        </Stack>
      </Box>

      {(asunto.asignadoA || asunto.fechaPosible || enArchivo) && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: 'wrap', gap: '8px' }}
        >
          {asunto.asignadoA && (
            <Badge
              size="small"
              color="accent"
              text={`Le podría tocar a ${nombreDe(asunto.asignadoA)}`}
            />
          )}

          {asunto.fechaPosible && (
            <Badge
              size="small"
              color="grey"
              text={`Fecha posible: ${fechaLegible(asunto.fechaPosible)}`}
            />
          )}

          {enArchivo && (
            <Badge
              size="small"
              color="green"
              text={`Tratada el ${formatDate(new Date(asunto.tratadoEl), 'dd/MM/yyyy')}`}
            />
          )}
        </Stack>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {enArchivo ? (
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
            onClick={() =>
              conAviso(() => dbAsuntoTratar(asunto.id), 'Pasa al archivo.')
            }
          >
            Ya se trató
          </Button>
        )}
      </Box>
    </Card>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ScrollableTabs
        tabs={[
          { label: `Pendientes (${pendientes.length})` },
          { label: `Archivo (${archivo.length})` },
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
              description="Cuando surja una necesidad de la congregación, apúntala aquí y no se perderá."
              action={
                <Button variant="main" disableAutoStretch onClick={abrirNuevo}>
                  Apuntar una necesidad
                </Button>
              }
            />
          )}

          {pendientes.map((asunto) => tarjeta(asunto, false))}
        </Box>
      )}

      {pestana === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!cargando && archivo.length === 0 && (
            <EmptyState
              icon={<IconCheckCircle />}
              title="El archivo está vacío"
              description={`Lo que se vaya tratando queda aquí ${MESES_EN_ARCHIVO} meses y luego se borra solo.`}
            />
          )}

          {archivo.length > 0 && (
            <Typography className="body-small-regular" color="var(--ink-3)">
              Lo archivado se borra solo a los {MESES_EN_ARCHIVO} meses de
              tratarse.
            </Typography>
          )}

          {archivo.map((asunto) => tarjeta(asunto, true))}
        </Box>
      )}

      <DialogAsunto
        open={abrirAsunto}
        asunto={editando}
        opcionesPersonas={opcionesPersonas}
        guardando={guardando}
        onClose={() => {
          setAbrirAsunto(false);
          setEditando(undefined);
        }}
        onGuardar={handleGuardar}
      />

      <ConfirmDialog
        open={Boolean(borrando)}
        title="Borrar la necesidad"
        message={`«${borrando?.titulo ?? ''}» desaparecerá para todos los ancianos.`}
        confirmLabel="Borrar"
        destructive
        onConfirm={async () => {
          const asunto = borrando;
          setBorrando(undefined);

          if (asunto) {
            await conAviso(
              () => dbAsuntoBorrar(asunto.id),
              'Necesidad borrada.'
            );
          }
        }}
        onCancel={() => setBorrando(undefined)}
      />
    </Box>
  );
};

export default AsuntosAncianos;
