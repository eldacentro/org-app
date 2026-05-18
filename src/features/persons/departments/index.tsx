import { Box } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { Checkbox, Typography } from '@components/index';
import { ALL_DEPARTMENT_TYPES, DepartmentType } from '@definition/person';
import useDepartments from './useDepartments';

const PersonDepartments = () => {
  const { t } = useAppTranslation();
  const { isPersonEditor } = useCurrentUser();
  const { person, handleDepartmentChange } = useDepartments();

  if (!person.person_data.male.value) {
    return null;
  }

  const getLabel = (dept: DepartmentType) => {
    switch (dept) {
      case 'acomodadores':
        return 'Acomodadores';
      case 'microfonos':
        return 'Micrófonos';
      case 'multimedia':
        return 'Multimedia';
      case 'plataforma':
        return 'Plataforma';
      default:
        return '';
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'var(--white)',
        border: '1px solid var(--accent-300)',
        display: 'flex',
        padding: '16px',
        gap: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
      }}
    >
      <Typography className="h2">
        {t('tr_departments', 'Departamentos')}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {ALL_DEPARTMENT_TYPES.map((dept) => {
          const isChecked =
            person.person_data.departments?.value?.includes(dept) || false;

          return (
            <Checkbox
              key={dept}
              label={getLabel(dept)}
              checked={isChecked}
              onChange={() => handleDepartmentChange(dept)}
              readOnly={!isPersonEditor}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default PersonDepartments;
