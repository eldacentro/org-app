import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Checkbox from '@components/checkbox';
import DatePicker from '@components/date_picker';
import Dialog from '@components/dialog';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';
import { fieldGroupsState } from '@states/field_service_groups';
import { SpeakerDinnerRotationType } from '@definition/speaker_invitation';

/**
 * La rotación de cenas: desde cuándo, con qué grupo empieza y quién entra.
 *
 * Es la misma forma que la rotación de Limpieza porque usa el mismo motor. Lo
 * que no se pregunta aquí es «cada cuánto»: una semana, siempre — es lo que se
 * pidió y lo que hace la rotación de la que sale.
 */
const DialogRotacionCenas = ({
  open,
  rotacion,
  guardando,
  onClose,
  onGuardar,
}: {
  open: boolean;
  rotacion: SpeakerDinnerRotationType | null;
  guardando: boolean;
  onClose: VoidFunction;
  onGuardar: (
    datos: Omit<SpeakerDinnerRotationType, 'updatedAt'>
  ) => Promise<void>;
}) => {
  const grupos = useAtomValue(fieldGroupsState);

  const activos = grupos
    .filter((g) => !g.group_data._deleted)
    .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);

  const [fecha, setFecha] = useState<Date | null>(new Date());
  const [grupoInicio, setGrupoInicio] = useState('');
  const [participantes, setParticipantes] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    setFecha(rotacion?.fechaInicio ? new Date(rotacion.fechaInicio) : new Date());
    setGrupoInicio(rotacion?.grupoInicio ?? activos[0]?.group_id ?? '');
    setParticipantes(
      rotacion?.gruposParticipantes?.length
        ? rotacion.gruposParticipantes
        : activos.map((g) => g.group_id)
    );
    // Solo al abrir: mientras está abierto manda lo que se está tocando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const nombre = (id: string) =>
    activos.find((g) => g.group_id === id)?.group_data.name || 'Grupo';

  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          Rotación de cenas
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          Cada semana le toca a un grupo. Se puede cambiar en una semana suelta
          sin romper el turno de las demás.
        </Typography>
      </Box>

      <DatePicker
        label="Empieza la semana del"
        value={fecha}
        onChange={(value) => setFecha(value)}
      />

      <Select
        label="Empieza el grupo"
        value={grupoInicio}
        onChange={(e) => setGrupoInicio(e.target.value as string)}
      >
        {activos.map((g) => (
          <MenuItem key={g.group_id} value={g.group_id}>
            <Typography className="body-regular" color="var(--black)">
              {nombre(g.group_id)}
            </Typography>
          </MenuItem>
        ))}
      </Select>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="body-small-semibold" color="var(--ink)">
          Grupos que entran en la rotación
        </Typography>
        {activos.map((g) => (
          <Checkbox
            key={g.group_id}
            label={nombre(g.group_id)}
            checked={participantes.includes(g.group_id)}
            onChange={(e) =>
              setParticipantes((prev) =>
                e.target.checked
                  ? [...prev, g.group_id]
                  : prev.filter((id) => id !== g.group_id)
              )
            }
          />
        ))}
      </Box>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="tertiary" disableAutoStretch onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="main"
          disableAutoStretch
          disabled={guardando || !fecha || !grupoInicio || participantes.length === 0}
          onClick={() =>
            onGuardar({
              fechaInicio: fecha ? fecha.toISOString() : '',
              grupoInicio,
              gruposParticipantes: participantes,
              overrides: rotacion?.overrides ?? {},
            })
          }
        >
          Guardar
        </Button>
      </Stack>
    </Dialog>
  );
};

export default DialogRotacionCenas;
