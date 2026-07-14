import { Box, Stack } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router';
import { UnverifiedReportEntry } from '@definition/notification';
import { personsActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { monthNamesState, isAppNotificationOpenState } from '@states/app';
import {
  selectedPublisherReportState,
  selectedMonthFieldServiceReportState,
} from '@states/field_service_reports';
import { buildPersonFullname } from '@utils/common';
import Typography from '@components/typography';
import Button from '@components/button';

const UnverifiedReportItem = ({ entry }: { entry: UnverifiedReportEntry }) => {
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const monthNames = useAtomValue(monthNamesState);

  const setOpen = useSetAtom(isAppNotificationOpenState);
  const setSelectedPublisher = useSetAtom(selectedPublisherReportState);
  const setSelectedMonth = useSetAtom(selectedMonthFieldServiceReportState);
  const navigate = useNavigate();

  const person = persons.find((p) => p.person_uid === entry.person_uid);
  const fullname = person
    ? buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      )
    : 'Publicador desconocido';

  const [year, month] = entry.report_date.split('/');
  const monthLabel = `${monthNames[+month - 1]} ${year}`;

  const handleViewReport = () => {
    setSelectedMonth(entry.report_date);
    setSelectedPublisher(entry.person_uid);
    setOpen(false);
    navigate('/reports/field-service');
  };

  return (
    <Box
      sx={{
        mt: '12px',
        p: '16px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--white)',
        boxShadow: 'var(--small-card-shadow)',
      }}
    >
      <Stack spacing={1.5}>
        <Stack spacing="2px">
          <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
            {fullname}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--grey-400)' }}>
            Informe de {monthLabel}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
          <Button
            variant="main"
            onClick={handleViewReport}
            sx={{
              height: '38px',
              minHeight: '38px',
              px: '20px',
              borderRadius: 'var(--radius-l)',
              fontWeight: 600,
              fontSize: '14px',
              letterSpacing: '0.01em',
              boxShadow: 'var(--btn-shadow)',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 'var(--hover-shadow)',
              },
            }}
          >
            Ver informe
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default UnverifiedReportItem;
