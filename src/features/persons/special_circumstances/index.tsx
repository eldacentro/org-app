import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { personCurrentDetailsState } from '@states/persons';
import { setPersonCurrentDetails } from '@services/states/persons';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import Checkbox from '@components/checkbox';
import Typography from '@components/typography';

const PersonSpecialCircumstances = () => {
  const { t } = useAppTranslation();
  const { isPersonEditor } = useCurrentUser();
  const person = useAtomValue(personCurrentDetailsState);

  const handleToggleDeaf = (_: unknown, checked: boolean) => {
    const newPerson = structuredClone(person);
    newPerson.person_data.deaf = {
      value: checked,
      updatedAt: new Date().toISOString(),
    };
    setPersonCurrentDetails(newPerson);
  };

  const handleToggleBlind = (_: unknown, checked: boolean) => {
    const newPerson = structuredClone(person);
    newPerson.person_data.blind = {
      value: checked,
      updatedAt: new Date().toISOString(),
    };
    setPersonCurrentDetails(newPerson);
  };

  const handleToggleIncarcerated = (_: unknown, checked: boolean) => {
    const newPerson = structuredClone(person);
    newPerson.person_data.incarcerated = {
      value: checked,
      updatedAt: new Date().toISOString(),
    };
    setPersonCurrentDetails(newPerson);
  };

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        display: 'flex',
        padding: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--r-lg)',
        flex: 1,
        width: '100%',
        gap: '16px',
      }}
    >
      <Typography className="h2">{t('tr_specialCircumstances')}</Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <Checkbox
          label={t('tr_deaf')}
          checked={person.person_data.deaf?.value || false}
          onChange={handleToggleDeaf}
          readOnly={!isPersonEditor}
        />

        <Checkbox
          label={t('tr_blind')}
          checked={person.person_data.blind?.value || false}
          onChange={handleToggleBlind}
          readOnly={!isPersonEditor}
        />

        <Checkbox
          label={t('tr_incarcerated')}
          checked={person.person_data.incarcerated?.value || false}
          onChange={handleToggleIncarcerated}
          readOnly={!isPersonEditor}
        />
      </Box>
    </Box>
  );
};

export default PersonSpecialCircumstances;
