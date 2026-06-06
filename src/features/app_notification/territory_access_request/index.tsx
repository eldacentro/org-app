import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { TerritoryRequest } from '@definition/territories';
import { buildPersonFullname } from '@utils/common';
import { personsActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import Typography from '@components/typography';
import Button from '@components/button';
import DialogAsignar from '@features/territories/dialogs/DialogAsignar';

const TerritoryAccessRequest = ({ request }: { request: TerritoryRequest }) => {
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [openAssign, setOpenAssign] = useState(false);

  const person = persons.find((p) => p.person_uid === request.personUid);
  const fullname = person
    ? buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      )
    : 'Publicador desconocido';

  return (
    <>
      <Box
        sx={{
          mt: '12px',
          p: '16px',
          borderRadius: '12px',
          border: '1px solid var(--accent-200)',
          backgroundColor: 'var(--white)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{fullname}</Typography>
          {request.nota && (
            <Typography variant="body2" sx={{ color: 'var(--grey-400)', lineHeight: 1.5 }}>
              <strong>Nota:</strong> {request.nota}
            </Typography>
          )}

          <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
            <Button
              variant="main"
              onClick={() => setOpenAssign(true)}
              sx={{
                height: '38px',
                minHeight: '38px',
                px: '20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                letterSpacing: '0.01em',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }
              }}
            >
              Asignar territorio
            </Button>
          </Stack>
        </Stack>
      </Box>

      {openAssign && (
        <DialogAsignar
          open={openAssign}
          onClose={() => setOpenAssign(false)}
          defaultPersonUid={request.personUid}
          requestId={request.id}
        />
      )}
    </>
  );
};

export default TerritoryAccessRequest;
