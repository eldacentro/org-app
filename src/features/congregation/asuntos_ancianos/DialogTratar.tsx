import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import AutoComplete from '@components/autocomplete';
import Button from '@components/button';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';

type Opcion = { id: string; etiqueta: string };

type DialogTratarProps = {
  open: boolean;
  asunto?: AsuntoAncianosType;
  opcionesAncianos: Opcion[];
  /** Quién está usando la app: es quien se propone por defecto. */
  yo: string;
  guardando: boolean;
  onClose: VoidFunction;
  onTratar: (datos: { tratadoPor: string; acuerdo: string }) => void;
};

/**
 * Dar un asunto por tratado.
 *
 * Pide EN QUÉ QUEDÓ, y es lo único que de verdad importa aquí. Un tablón que
 * solo guarda «tratado el 4 de octubre» no sirve de nada dentro de un año: lo
 * que hace falta recordar es lo que se decidió. No es obligatorio —obligar a
 * escribir acabaría en «ok»—, pero se pide con nombre y apellidos.
 */
const DialogTratar = ({
  open,
  asunto,
  opcionesAncianos,
  yo,
  guardando,
  onClose,
  onTratar,
}: DialogTratarProps) => {
  const [quien, setQuien] = useState<Opcion | null>(null);
  const [acuerdo, setAcuerdo] = useState('');

  useEffect(() => {
    if (!open) return;

    setAcuerdo(asunto?.acuerdo ?? '');
    setQuien(
      opcionesAncianos.find(
        (record) => record.id === (asunto?.tratadoPor || yo)
      ) ?? null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          Dar por tratado
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          {asunto?.titulo}
        </Typography>
      </Box>

      <AutoComplete
        fullWidth
        label="Lo trató"
        options={opcionesAncianos}
        value={quien}
        isOptionEqualToValue={(o: Opcion, v: Opcion) => o.id === v.id}
        getOptionLabel={(o: Opcion) => o.etiqueta}
        onChange={(_, value: Opcion | null) => setQuien(value)}
      />

      <TextField
        label="En qué quedó"
        placeholder="Lo que se acordó, en una o dos líneas"
        value={acuerdo}
        onChange={(e) => setAcuerdo(e.target.value)}
        multiline
        rows={3}
        autoFocus
      />

      <Typography className="label-small-regular" color="var(--ink-3)">
        Pasará al historial con la fecha de hoy. Se puede devolver a pendientes
        si hiciera falta.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
        }}
      >
        <Button variant="tertiary" disableAutoStretch onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="main"
          disableAutoStretch
          disabled={guardando}
          onClick={() =>
            onTratar({ tratadoPor: quien?.id ?? yo, acuerdo })
          }
        >
          Dar por tratado
        </Button>
      </Box>
    </Dialog>
  );
};

export default DialogTratar;
