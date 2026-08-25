import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Button from '@components/button';
import { IconGroups, IconShare, IconChevronRight } from '@components/icons';

/**
 * Hay dos maneras de compartir un territorio y no son intercambiables, así
 * que se pregunta en vez de esconder una detrás de la otra.
 *
 * Antes solo estaba el enlace, y el botón decía "Compartir enlace" — con lo
 * que pasar un territorio al hermano de al lado, que tiene la app y una
 * cuenta, obligaba a salir a WhatsApp. Al aparecer la otra forma, un tercer
 * botón en la barra dejaba los tres tan estrechos que "Compartir enlace" se
 * partía en dos renglones.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  onHermano: () => void;
  onEnlace: () => void;
};

const Opcion = ({
  icono,
  titulo,
  detalle,
  onClick,
}: {
  icono: ReactNode;
  titulo: string;
  detalle: string;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    className="active-press"
    sx={{
      appearance: 'none',
      font: 'inherit',
      textAlign: 'left',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 14px',
      borderRadius: 'var(--shape-lg)',
      border: '1px solid var(--line)',
      backgroundColor: 'var(--card)',
      cursor: 'pointer',
      transition: 'background-color var(--motion-fast) var(--ease-standard)',
      '&:hover': { backgroundColor: 'var(--state-hover)' },
      '&:focus-visible': {
        outline: '2px solid var(--accent-main)',
        outlineOffset: '2px',
      },
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: 'var(--shape-md)',
        backgroundColor: 'var(--accent-150)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icono}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography className="body-small-semibold" color="var(--ink)">
        {titulo}
      </Typography>
      <Typography
        className="label-small-regular"
        color="var(--ink-2)"
        sx={{ display: 'block' }}
      >
        {detalle}
      </Typography>
    </Box>
    <IconChevronRight color="var(--ink-3)" width={20} height={20} />
  </Box>
);

const DialogElegirCompartir = ({
  open,
  onClose,
  onHermano,
  onEnlace,
}: Props) => (
  <Dialog open={open} onClose={onClose}>
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography className="h2" color="var(--ink)">
        Compartir el territorio
      </Typography>

      <Stack spacing={1}>
        <Opcion
          icono={
            <IconGroups color="var(--accent-dark)" width={20} height={20} />
          }
          titulo="Con un hermano"
          detalle="Lo ve en su móvil durante la salida"
          onClick={onHermano}
        />
        <Opcion
          icono={
            <IconShare color="var(--accent-dark)" width={20} height={20} />
          }
          titulo="Por enlace o QR"
          detalle="Para quien no tiene la aplicación"
          onClick={onEnlace}
        />
      </Stack>

      <Stack direction="row" justifyContent="flex-end">
        <Button variant="secondary" disableAutoStretch onClick={onClose}>
          Cancelar
        </Button>
      </Stack>
    </Stack>
  </Dialog>
);

export default DialogElegirCompartir;
