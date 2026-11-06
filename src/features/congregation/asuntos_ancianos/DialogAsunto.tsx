import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import AutoComplete from '@components/autocomplete';
import Button from '@components/button';
import DatePicker from '@components/date_picker';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';
import { formatDate } from '@utils/date';

type Opcion = { id: string; etiqueta: string };

export type DatosNecesidad = {
  titulo: string;
  detalle: string;
  asignadoA: string;
  fechaPosible: string;
};

type DialogAsuntoProps = {
  open: boolean;
  /** Si viene, se está editando; si no, se está apuntando una nueva. */
  asunto?: AsuntoAncianosType;
  opcionesPersonas: Opcion[];
  guardando: boolean;
  onClose: VoidFunction;
  onGuardar: (datos: DatosNecesidad) => void;
};

/** 'YYYY/MM/DD' → Date a medianoche local, sin que la mueva la zona horaria. */
const aFecha = (texto?: string) => {
  if (!texto) return null;

  const [y, m, d] = texto.split('/').map(Number);

  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d);
};

/**
 * Apuntar una necesidad, o corregirla.
 *
 * Solo el tema es obligatorio: si apuntar algo cuesta rellenar un formulario,
 * no se apunta. Lo demás se puede añadir cuando se sepa.
 */
const DialogAsunto = ({
  open,
  asunto,
  opcionesPersonas,
  guardando,
  onClose,
  onGuardar,
}: DialogAsuntoProps) => {
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [responsable, setResponsable] = useState<Opcion | null>(null);
  const [fecha, setFecha] = useState<Date | null>(null);

  // Al abrir se parte de lo que haya guardado. Mientras está abierto manda lo
  // que se está escribiendo: recargar desde fuera borraría el texto a medias.
  useEffect(() => {
    if (!open) return;

    setTitulo(asunto?.titulo ?? '');
    setDetalle(asunto?.detalle ?? '');
    setFecha(aFecha(asunto?.fechaPosible));
    setResponsable(
      opcionesPersonas.find((record) => record.id === asunto?.asignadoA) ?? null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const puedeGuardar = titulo.trim().length > 0 && !guardando;

  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          {asunto ? 'Editar necesidad' : 'Apuntar una necesidad'}
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          Con el tema basta; lo demás se puede completar cuando se sepa.
        </Typography>
      </Box>

      <TextField
        label="Tema"
        placeholder="Por ejemplo: arreglar la megafonía del salón"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
      />

      <TextField
        label="Detalle (opcional)"
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        multiline
        rows={3}
      />

      <AutoComplete
        fullWidth
        label="A quién le podría tocar (opcional)"
        options={opcionesPersonas}
        value={responsable}
        isOptionEqualToValue={(o: Opcion, v: Opcion) => o.id === v.id}
        getOptionLabel={(o: Opcion) => o.etiqueta}
        onChange={(_, value: Opcion | null) => setResponsable(value)}
      />

      <DatePicker
        label="Fecha posible (opcional)"
        value={fecha}
        onChange={(d) => setFecha(d && !isNaN(d.getTime()) ? d : null)}
        view="input"
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
              fechaPosible: fecha ? formatDate(fecha, 'yyyy/MM/dd') : '',
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
