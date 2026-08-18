import { Box, Stack } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router';
import { PioneerApplicationEntry } from '@definition/notification';
import { personsState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { isAppNotificationOpenState, monthNamesState } from '@states/app';
import { buildPersonFullname, capitalizarPrimera } from '@utils/common';
import { groupConsecutiveMonths } from '@utils/date';
import Typography from '@components/typography';
import Button from '@components/button';

const PioneerApplicationItem = ({
  entry,
}: {
  entry: PioneerApplicationEntry;
}) => {
  // personsState y no personsActiveState: si al solicitante lo archivan o lo
  // borran mientras su solicitud sigue pendiente, el aviso tiene que seguir
  // diciendo de quién es — y aun así no puede reventar si no aparece.
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const monthNames = useAtomValue(monthNamesState);

  const setOpen = useSetAtom(isAppNotificationOpenState);
  const navigate = useNavigate();

  const person = persons.find((p) => p.person_uid === entry.person_uid);

  const fullname = person
    ? buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      )
    : 'Publicador desconocido';

  const monthsLabel = groupConsecutiveMonths([...entry.months].sort())
    .map((group) => {
      const splits = group.split('-');
      const [startYear, startMonth] = splits[0].split('/');

      let label = `${capitalizarPrimera(monthNames[+startMonth - 1])} ${startYear}`;

      if (splits[1]) {
        const [endYear, endMonth] = splits[1].split('/');
        label += ` - ${capitalizarPrimera(monthNames[+endMonth - 1])} ${endYear}`;
      }

      return label;
    })
    .join(', ');

  const handleOpenApplication = () => {
    setOpen(false);
    navigate(`/pioneer-applications/${entry.request_id}`);
  };

  return (
    <Box
      sx={{
        mt: '12px',
        p: '16px',
        borderRadius: 'var(--shape-md)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--white)',
        boxShadow: 'var(--small-card-shadow)',
      }}
    >
      <Stack spacing={1.5}>
        <Stack spacing="2px">
          <Typography
            sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}
          >
            {fullname}
          </Typography>
          {monthsLabel.length > 0 && (
            <Typography variant="body2" sx={{ color: 'var(--grey-400)' }}>
              {monthsLabel}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
          <Button
            variant="main"
            onClick={handleOpenApplication}
            sx={{
              height: '38px',
              minHeight: '38px',
              px: '20px',
              borderRadius: 'var(--shape-sm)',
              fontWeight: 600,
              fontSize: '13px',
              letterSpacing: '0.01em',
              boxShadow: 'var(--btn-shadow)',
              transition:
                'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 'var(--hover-shadow)',
              },
            }}
          >
            Ver solicitud
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default PioneerApplicationItem;
