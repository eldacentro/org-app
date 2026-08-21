import { useState } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { meetingRunNoteEditorState } from '@states/meeting_run';
import { IconEdit } from '@components/icons';
import Typography from '@components/typography';
import { useMeetingRunPart } from '../meeting_run/useMeetingRunPart';
import NoteDialog from '../meeting_run/note_dialog';

/**
 * Lo que quien preside apuntó de esta parte, debajo de ella.
 *
 * Estaba en la barra de abajo y no se sabía de qué parte era: había que
 * acordarse de cuál estaba sonando cuando se escribió. Aquí se lee pegada a la
 * suya, se toca para cambiarla o borrarla, y se puede apuntar sobre una parte
 * que ya pasó sin tener que volver a ella con la barra.
 *
 * No se pinta nada para quien no puede escribir ni tiene nada que leer: al que
 * solo mira le llegan vacías salvo que la congregación las haya compartido, y a
 * un publicador no le llegan nunca, porque viajan cifradas con la llave maestra.
 */
const PartNote = ({ partKey }: { partKey: string }) => {
  const run = useMeetingRunPart(partKey);
  const editor = useAtomValue(meetingRunNoteEditorState);

  const [abierto, setAbierto] = useState(false);

  const nota = run?.note;

  // Apuntar solo tiene sentido sobre lo que ya ha pasado o está pasando: de una
  // parte que aún no ha empezado no hay nada que decir, y ofrecerlo en las doce
  // llenaría el programa de enlaces que nadie va a tocar.
  const sePuedeApuntar =
    !!editor &&
    (run?.finished || run?.status === 'done' || run?.status === 'current');

  if (!nota && !sePuedeApuntar) return null;

  const ficha = editor?.info?.[partKey];

  return (
    <>
      {nota && (
        <Box
          component={editor ? 'button' : 'div'}
          type={editor ? 'button' : undefined}
          onClick={editor ? () => setAbierto(true) : undefined}
          sx={{
            appearance: 'none',
            font: 'inherit',
            textAlign: 'left',
            width: '100%',
            display: 'block',
            padding: '8px 12px',
            borderRadius: 'var(--shape-sm)',
            backgroundColor: 'var(--accent-100)',
            border: '1px solid var(--accent-200)',
            cursor: editor ? 'pointer' : 'default',
            transition:
              'background-color var(--motion-fast) var(--ease-standard)',
            '&:hover': editor
              ? { backgroundColor: 'var(--accent-200)' }
              : undefined,
          }}
        >
          <Typography className="label-small-regular" color="var(--ink-2)">
            {nota}
          </Typography>
        </Box>
      )}

      {!nota && sePuedeApuntar && (
        <Box
          component="button"
          type="button"
          onClick={() => setAbierto(true)}
          sx={{
            appearance: 'none',
            font: 'inherit',
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: 'pointer',
            textAlign: 'left',
            width: 'fit-content',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <IconEdit width={14} height={14} color="var(--accent-main)" />
          <Typography
            className="label-small-semibold"
            color="var(--accent-main)"
          >
            Apuntar algo
          </Typography>
        </Box>
      )}

      {editor && (
        <NoteDialog
          open={abierto}
          label={ficha?.label ?? 'Esta parte'}
          person={ficha?.person}
          value={nota}
          onClose={() => setAbierto(false)}
          onSave={(texto) => {
            editor.anotar(partKey, texto);
            setAbierto(false);
          }}
          onDelete={
            nota
              ? () => {
                  editor.anotar(partKey, '');
                  setAbierto(false);
                }
              : undefined
          }
        />
      )}
    </>
  );
};

export default PartNote;
