import { Box, TextField } from '@mui/material';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { buildPersonFullname } from '@utils/common';
import { useAtomValue } from 'jotai';
import { fullnameOptionState } from '@states/settings';
import useTalksFix, { leerNumeros } from './useTalksFix';
import Button from '@components/button';
import Dialog from '@components/dialog';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';

/**
 * Corregir los discursos de un orador del circuito.
 *
 * Por qué hace falta: la lista de discursos de un orador del circuito la
 * reconstruye el Google Sheets en cada pasada —lo que trae se queda, lo que no
 * trae se borra—, así que cuando un hermano cambia sus discursos y no se lo dice
 * a quien lleva el Sheet, aquí no había manera de apuntarlo.
 *
 * Lo que se guarda es la lista ENTERA («estos son sus discursos»), no un parche:
 * así sirve igual para añadir los que faltan que para quitar los que ya no da,
 * que es justo lo que no se podía hacer de ninguna forma.
 */
const TalksFix = ({
  speaker,
  open,
  onClose,
}: {
  speaker: VisitingSpeakerType;
  open: boolean;
  onClose: VoidFunction;
}) => {
  const fullnameOption = useAtomValue(fullnameOptionState);

  const {
    texto,
    setTexto,
    nota,
    setNota,
    guardando,
    correccion,
    delSheet,
    redundante,
    guardar,
    volverAlSheet,
  } = useTalksFix(speaker);

  const nombre = buildPersonFullname(
    speaker.speaker_data.person_lastname.value,
    speaker.speaker_data.person_firstname.value,
    fullnameOption
  );

  return (
    <Dialog open={open} onClose={onClose}>
      <Typography className="h2" sx={{ color: 'var(--ink)', mb: '4px' }}>
        Discursos de {nombre}
      </Typography>
      <Typography
        className="body-small-regular"
        sx={{ color: 'var(--ink-2)', mb: '16px' }}
      >
        Escribe los números que da de verdad, separados como quieras. Esta lista
        manda sobre la del circuito y la ve toda la congregación.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={2}
        autoComplete="off"
        label="Sus discursos"
        placeholder="14, 42, 77"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
      />

      <Typography
        className="label-small-regular"
        color="var(--ink-3)"
        sx={{ mt: '6px', mb: '16px' }}
      >
        {delSheet.length > 0
          ? `El Sheet del circuito dice: ${delSheet.join(', ')}`
          : 'El Sheet del circuito no le trae ningún discurso.'}
      </Typography>

      <TextField
        fullWidth
        autoComplete="off"
        label="De dónde sale (opcional)"
        placeholder="Me lo dijo él por WhatsApp el 20 de agosto"
        value={nota}
        onChange={(event) => setNota(event.target.value)}
      />

      {redundante && (
        <Box sx={{ mt: '16px' }}>
          <InfoTip
            color="success"
            isBig={false}
            text="El Sheet ya dice lo mismo, así que esta corrección ya no hace falta. Puedes quitarla."
          />
        </Box>
      )}

      <Box sx={{ mt: '16px' }}>
        <InfoTip
          color="info"
          isBig={false}
          text="Esto no cambia el Sheet del circuito: hay que avisar igualmente al hermano que lo lleva, o al resto de congregaciones les seguirá saliendo lo antiguo."
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          mt: '16px',
          flexWrap: 'wrap',
        }}
      >
        {correccion ? (
          <Button
            variant="secondary"
            color="red"
            disabled={guardando}
            onClick={async () => {
              await volverAlSheet();
              onClose();
            }}
          >
            Volver a lo del Sheet
          </Button>
        ) : (
          <Box />
        )}

        <Box sx={{ display: 'flex', gap: '8px' }}>
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="main"
            disabled={guardando || leerNumeros(texto).length === 0}
            onClick={async () => {
              await guardar();
              onClose();
            }}
          >
            Guardar
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default TalksFix;
