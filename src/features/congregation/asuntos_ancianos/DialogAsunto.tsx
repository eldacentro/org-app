import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import AutoComplete from '@components/autocomplete';
import Button from '@components/button';
import Checkbox from '@components/checkbox';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';

type Opcion = { id: string; etiqueta: string };

type DialogAsuntoProps = {
  open: boolean;
  /** Si viene, se está editando; si no, se está apuntando uno nuevo. */
  asunto?: AsuntoAncianosType;
  opcionesAncianos: Opcion[];
  guardando: boolean;
  onClose: VoidFunction;
  onGuardar: (datos: {
    titulo: string;
    detalle: string;
    asignadoA: string;
    urgente: boolean;
  }) => void;
};

/**
 * Apuntar un asunto, o corregirlo.
 *
 * Solo el título es obligatorio: si apuntar algo cuesta rellenar un formulario,
 * no se apunta y el tablón se queda vacío mientras los asuntos siguen en la
 * cabeza de cada uno. Lo demás se puede añadir luego.
 */
const DialogAsunto = ({
  open,
  asunto,
  opcionesAncianos,
  guardando,
  onClose,
  onGuardar,
}: DialogAsuntoProps) => {
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [responsable, setResponsable] = useState<Opcion | null>(null);
  const [urgente, setUrgente] = useState(false);

  // Al abrir se parte de lo que haya guardado. Mientras está abierto manda lo
  // que se está escribiendo: recargar desde fuera borraría el texto a medias.
  useEffect(() => {
    if (!open) return;

    setTitulo(asunto?.titulo ?? '');
    setDetalle(asunto?.detalle ?? '');
    setUrgente(asunto?.urgente ?? false);
    setResponsable(
      opcionesAncianos.find((record) => record.id === asunto?.asignadoA) ?? null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const puedeGuardar = titulo.trim().length > 0 && !guardando;

  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          {asunto ? 'Editar asunto' : 'Apuntar un asunto'}
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          Lo que haya que tratar en el cuerpo de ancianos. Con el título basta;
          lo demás se puede completar cuando se sepa.
        </Typography>
      </Box>

      <TextField
        label="Asunto"
        placeholder="Por ejemplo: revisar el horario de limpieza del salón"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
      />

      <TextField
        label="Detalles (opcional)"
        placeholder="Lo que haga falta saber para tratarlo"
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        multiline
        rows={3}
      />

      <AutoComplete
        fullWidth
        label="Responsable (opcional)"
        options={opcionesAncianos}
        value={responsable}
        isOptionEqualToValue={(o: Opcion, v: Opcion) => o.id === v.id}
        getOptionLabel={(o: Opcion) => o.etiqueta}
        onChange={(_, value: Opcion | null) => setResponsable(value)}
      />

      <Checkbox
        label="Urgente"
        checked={urgente}
        onChange={(e) => setUrgente(e.target.checked)}
      />

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
          disabled={!puedeGuardar}
          onClick={() =>
            onGuardar({
              titulo,
              detalle,
              asignadoA: responsable?.id ?? '',
              urgente,
            })
          }
        >
          {asunto ? 'Guardar' : 'Apuntar'}
        </Button>
      </Box>
    </Dialog>
  );
};

export default DialogAsunto;
