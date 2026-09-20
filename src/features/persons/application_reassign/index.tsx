import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import AutoComplete from '@components/autocomplete';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import { personsActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { formatDate } from '@utils/date';
import { personWasPublisherBy } from '@services/app/publisher_status';

type Opcion = { id: string; etiqueta: string };

type ApplicationReassignProps = {
  open: boolean;
  saving: boolean;
  /** A quién está ahora, para no ofrecerla a la misma persona. */
  currentUid: string;
  /** Qué pasará al mover la solicitud a esa persona. */
  plan: (person_uid: string) => {
    aprobada: boolean;
    nombreAnterior: string;
    nombreNuevo: string;
    meses: string;
    quitaDelAnterior: boolean;
    conservaElAnterior: boolean;
  };
  onClose: VoidFunction;
  onConfirm: (person_uid: string) => void;
};

/**
 * «Cambiar de persona» — a quién corresponde de verdad una solicitud.
 *
 * Por qué hace falta: antes de que se pudiera enviar por una persona delegada,
 * un padre mandaba la de su hija desde su cuenta y quedaba a su nombre. En la
 * lista salían dos suyas —una marcada como repetida— y no había forma de
 * corregirlo.
 *
 * El diálogo dice ANTES de confirmar qué va a pasar con la inscripción de
 * precursor auxiliar, porque mover una solicitud aprobada mueve también un
 * nombramiento, y eso no puede ser una sorpresa.
 */
const ApplicationReassign = ({
  open,
  saving,
  currentUid,
  plan,
  onClose,
  onConfirm,
}: ApplicationReassignProps) => {
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [elegido, setElegido] = useState<Opcion | null>(null);

  // Publicadores, que son quienes pueden ser precursores auxiliares. Aquí no se
  // acota a las personas delegadas: esto no es enviar una solicitud, es
  // corregir a quién pertenece, y lo hace el comité de servicio.
  const opciones = useMemo(() => {
    const month = formatDate(new Date(), 'yyyy/MM');

    return persons
      .filter((person) => person.person_uid !== currentUid)
      .filter((person) => personWasPublisherBy(person, month))
      .map((person) => ({
        id: person.person_uid,
        etiqueta: buildPersonFullname(
          person.person_data.person_lastname.value,
          person.person_data.person_firstname.value,
          fullnameOption
        ),
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [persons, currentUid, fullnameOption]);

  const detalle = elegido ? plan(elegido.id) : null;

  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          Cambiar de persona
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          Elige a quién corresponde en realidad esta solicitud. Sirve para
          corregir una que se envió desde la cuenta de otra persona.
        </Typography>
      </Box>

      <AutoComplete
        fullWidth
        label="Corresponde a"
        options={opciones}
        value={elegido}
        isOptionEqualToValue={(o: Opcion, v: Opcion) => o.id === v.id}
        getOptionLabel={(o: Opcion) => o.etiqueta}
        onChange={(_, value: Opcion | null) => setElegido(value)}
      />

      {detalle && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography className="body-small-semibold" color="var(--ink)">
            Al confirmar:
          </Typography>

          <Typography className="body-small-regular" color="var(--ink-2)">
            · La solicitud pasa a {detalle.nombreNuevo}, y queda escrito que la
            envió {detalle.nombreAnterior || 'la persona anterior'}.
          </Typography>

          {detalle.aprobada && (
            <Typography className="body-small-regular" color="var(--ink-2)">
              · Como está aprobada, {detalle.nombreNuevo} queda inscrito como
              precursor auxiliar
              {detalle.meses ? ` de ${detalle.meses}` : ''}.
            </Typography>
          )}

          {detalle.quitaDelAnterior && (
            <Typography className="body-small-regular" color="var(--ink-2)">
              · A {detalle.nombreAnterior || 'la persona anterior'} se le retira
              esa inscripción, que no era suya.
            </Typography>
          )}

          {detalle.conservaElAnterior && (
            <Typography className="body-small-regular" color="var(--amber)">
              · {detalle.nombreAnterior || 'La persona anterior'} conserva su
              inscripción de esos meses, porque tiene otra solicitud aprobada
              que la justifica.
            </Typography>
          )}
        </Box>
      )}

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
          disabled={!elegido || saving}
          onClick={() => elegido && onConfirm(elegido.id)}
        >
          Cambiar
        </Button>
      </Box>
    </Dialog>
  );
};

export default ApplicationReassign;
