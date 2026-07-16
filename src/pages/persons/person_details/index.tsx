import { Box } from '@mui/material';
import { PageTitle } from '@components/index';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import usePersonDetails from './usePersonDetails';
import PersonAppUserProfile from '@features/persons/app_user_profile';
import PersonButtonActions from '@features/persons/button_actions';
import PersonBasicInfo from '@features/persons/basic_info';
import PersonEnrollments from '@features/persons/enrollments';
import PersonSpiritualStatus from '@features/persons/spiritual_status';
import PersonPredicacion from '@features/persons/predicacion';
import PersonSpecialCircumstances from '@features/persons/special_circumstances';
import PersonPrivileges from '@features/persons/privileges';
import PersonTimeAway from '@features/persons/time_away';
import PersonEmergencyContacts from '@features/persons/emergency_contacts';
import PersonFieldGroup from '@features/persons/field_group';
import PersonAssignmentsHistory from '@features/persons/assignments_history';
import PersonAssignments from '@features/persons/assignments';
import FamilyMembers from '@features/persons/family_members';
import PersonDepartments from '@features/persons/departments';

const PersonDetails = () => {
  const { t } = useAppTranslation();

  const { desktopUp } = useBreakpoints();

  const { isAdmin } = useCurrentUser();

  const { isNewPerson, isBaptized, male, isConnected } = usePersonDetails();

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <PageTitle
        title={isNewPerson ? t('tr_addNewPerson') : t('tr_editPerson')}
        buttons={<PersonButtonActions />}
      />

      <Box
        sx={{
          borderRadius: 'var(--r-lg)',
          display: 'flex',
          gap: '16px',
          flexDirection: desktopUp ? 'row' : 'column',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
            flex: 0.77,
            width: desktopUp ? 'auto' : '100%',
          }}
        >
          <PersonBasicInfo />

          {!isNewPerson && isConnected && isAdmin && <PersonAppUserProfile />}

          <PersonSpiritualStatus />

          <PersonPredicacion />

          <PersonSpecialCircumstances />

          <FamilyMembers />

          {isBaptized && (
            <Box
              sx={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--line)',
                display: 'flex',
                padding: '16px',
                gap: '16px',
                flexDirection: 'column',
                borderRadius: 'var(--r-lg)',
                flex: 1,
                width: '100%',
              }}
            >
              {male && <PersonPrivileges />}

              <PersonEnrollments />
            </Box>
          )}

          {male && <PersonDepartments />}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            gap: '16px',
            width: '100%',
            flexDirection: 'column',
          }}
        >
          <PersonAssignments />

          {!isNewPerson && <PersonAssignmentsHistory />}

          <PersonTimeAway />
          <PersonFieldGroup />
          <PersonEmergencyContacts />
        </Box>
      </Box>


    </Box>
  );
};

export default PersonDetails;
