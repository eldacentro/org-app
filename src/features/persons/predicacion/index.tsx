import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useParams } from 'react-router';
import { personCurrentDetailsState } from '@states/persons';
import { setPersonCurrentDetails } from '@services/states/persons';
import { displaySnackNotification } from '@services/states/app';
import { dbPersonsSavePredicacion } from '@services/dexie/persons';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { getMessageByCode } from '@services/i18n/translation';
import { IconCheckCircle, IconError } from '@components/icons';
import worker from '@services/worker/backupWorker';
import Checkbox from '@components/checkbox';
import Typography from '@components/typography';

type CampoPredicacion = 'predicacion_salidas' | 'predicacion_exhibidores';

const PersonPredicacion = () => {
  const { t } = useAppTranslation();

  const { id } = useParams();

  const { isPersonEditor, isServiceCommittee } = useCurrentUser();
  const person = useAtomValue(personCurrentDetailsState);

  const male = person.person_data.male.value;

  // QUIÉN decide esto es el superintendente de servicio, y no podía: la casilla
  // se abría solo a quien edita personas (administradores y quienes llevan un
  // programa de reunión), y a él le salía de solo lectura y sin botón de
  // Guardar. A un hermano nuevo no había forma de meterlo en las salidas ni en
  // los exhibidores sin pedírselo a un administrador.
  //
  // Dos caminos, según quién sea:
  //  - Editor de personas: como el resto de la ficha — se marca y se guarda con
  //    el botón de arriba.
  //  - Comité de servicio sin ser editor: no tiene botón, así que se guarda AL
  //    MARCAR, y solo ese campo (`dbPersonsSavePredicacion`).
  const guardaAlMarcar = !isPersonEditor && isServiceCommittee && Boolean(id);
  const puedeMarcar = isPersonEditor || guardaAlMarcar;

  const handleToggle = async (campo: CampoPredicacion, checked: boolean) => {
    const newPerson = structuredClone(person);

    newPerson.person_data[campo] = {
      value: checked,
      updatedAt: new Date().toISOString(),
    };

    setPersonCurrentDetails(newPerson);

    if (!guardaAlMarcar) return;

    try {
      await dbPersonsSavePredicacion(person.person_uid, campo, checked);

      worker.postMessage('startWorker');

      displaySnackNotification({
        header: t('tr_personSaved'),
        message: t('tr_personSavedDesc'),
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });
    } catch (error) {
      // No se ha guardado: la casilla vuelve a como estaba, para que lo que se
      // ve sea lo que hay.
      setPersonCurrentDetails(person);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        display: 'flex',
        padding: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--shape-xl)',
        flex: 1,
        width: '100%',
        gap: '16px',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2">Predicación</Typography>

        {guardaAlMarcar && (
          <Typography className="body-small-regular" color="var(--ink-2)">
            Se guarda al marcar.
          </Typography>
        )}
      </Box>

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
            onChange={(_, checked) =>
              handleToggle('predicacion_salidas', checked)
            }
            readOnly={!puedeMarcar}
          />
        )}

        <Checkbox
          label="Exhibidores"
          checked={person.person_data.predicacion_exhibidores?.value || false}
          onChange={(_, checked) =>
            handleToggle('predicacion_exhibidores', checked)
          }
          readOnly={!puedeMarcar}
        />
      </Box>
    </Box>
  );
};

export default PersonPredicacion;
