import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { personCurrentDetailsState } from '@states/persons';
import { setPersonCurrentDetails } from '@services/states/persons';
import { useCurrentUser } from '@hooks/index';
import Checkbox from '@components/checkbox';
import Typography from '@components/typography';
import { dbPersonsSave } from '@services/dexie/persons';

const PersonPredicacion = () => {
  const { isPersonEditor } = useCurrentUser();
  const person = useAtomValue(personCurrentDetailsState);

  const male = person.person_data.male.value;

  const handleToggleSalidas = async (_: unknown, checked: boolean) => {
    const newPerson = structuredClone(person);
    newPerson.person_data.predicacion_salidas = {
      value: checked,
      updatedAt: new Date().toISOString(),
    };
    setPersonCurrentDetails(newPerson);
    await dbPersonsSave(newPerson);
    import('@services/worker/backupWorker').then(
      ({ default: worker }) => worker.postMessage('startWorker')
    );
  };

  const handleToggleExhibidores = async (_: unknown, checked: boolean) => {
    const newPerson = structuredClone(person);
    newPerson.person_data.predicacion_exhibidores = {
      value: checked,
      updatedAt: new Date().toISOString(),
    };
    setPersonCurrentDetails(newPerson);
    await dbPersonsSave(newPerson);
    import('@services/worker/backupWorker').then(
      ({ default: worker }) => worker.postMessage('startWorker')
    );
  };

  return (
    <Box
      sx={{
        backgroundColor: 'var(--white)',
        border: '1px solid var(--accent-300)',
        display: 'flex',
        padding: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        flex: 1,
        width: '100%',
        gap: '16px',
      }}
    >
      <Typography className="h2">Predicación</Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {male && (
          <Checkbox
            label="Salidas"
            checked={person.person_data.predicacion_salidas?.value || false}
            onChange={handleToggleSalidas}
            readOnly={!isPersonEditor}
          />
        )}

        <Checkbox
          label="Exhibidores"
          checked={person.person_data.predicacion_exhibidores?.value || false}
          onChange={handleToggleExhibidores}
          readOnly={!isPersonEditor}
        />
      </Box>
    </Box>
  );
};

export default PersonPredicacion;
