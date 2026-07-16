import { Box } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import useSpiritualStatus from './useSpiritualStatus';
import BaptizedPublisher from './baptized_publisher';
import Checkbox from '@components/checkbox';
import MidweekMeetingStudent from './midweek_meeting_student';
import Typography from '@components/typography';
import UnbaptizedPublisher from './unbaptized_publisher';

const PersonSpiritualStatus = () => {
  const { t } = useAppTranslation();

  const { isPersonEditor } = useCurrentUser();

  const {
    person,
    handleToggleMidweekMeetingStudent,
    handleToggleUnbaptizedPublisher,
    handleToggleBaptizedPublisher,
    expandedStatus,
    handleToggleExpand,
    handleToggleArchive,
    isInactivePublisher,
    handleToggleVisibleInGroups,
  } = useSpiritualStatus();

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
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <Typography className="h2">{t('tr_spiritualStatus')}</Typography>
        <Checkbox
          label={t('tr_archived')}
          checked={person.person_data.archived.value}
          onChange={handleToggleArchive}
          readOnly={!isPersonEditor}
        />
      </Box>

      <Box
        sx={{
          '& > .MuiBox-root': {
            borderTop: '1px solid var(--line)',
            padding: '16px 0',
          },
          '& > .MuiBox-root:first-of-type': {
            borderTop: 'none',
          },
        }}
      >
        <BaptizedPublisher
          checked={person.person_data.publisher_baptized.active.value}
          onChange={handleToggleBaptizedPublisher}
          expanded={expandedStatus.baptized}
          onExpand={() => handleToggleExpand('baptized')}
        />

        <UnbaptizedPublisher
          checked={person.person_data.publisher_unbaptized.active.value}
          onChange={handleToggleUnbaptizedPublisher}
          expanded={expandedStatus.unbaptized}
          onExpand={() => handleToggleExpand('unbaptized')}
        />

        <MidweekMeetingStudent
          checked={person.person_data.midweek_meeting_student.active.value}
          onChange={handleToggleMidweekMeetingStudent}
          expanded={expandedStatus.midweek}
          onExpand={() => handleToggleExpand('midweek')}
        />
      </Box>

      {isInactivePublisher && (
        <Box
          sx={{
            borderTop: '1px solid var(--line)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <Checkbox
            label="Mantener visible en Grupos de predicación"
            checked={
              person.person_data.grupo_visible_inactivo?.value || false
            }
            onChange={(_, checked) => handleToggleVisibleInGroups(checked)}
            readOnly={!isPersonEditor}
          />
          <Typography
            className="label-small-regular"
            color="var(--grey-350)"
            sx={{ paddingLeft: '34px' }}
          >
            Al estar inactivo, normalmente solo los ancianos lo ven en su
            grupo. Con esta concesión seguirá apareciendo para toda la
            congregación. No afecta a los informes: no contará como pendiente
            de informar.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PersonSpiritualStatus;
