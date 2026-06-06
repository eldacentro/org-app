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
          borderRadius: 'var(--radius-l)',
          padding: '12px',
          border: '1px solid var(--accent-300)',
          marginTop: '8px',
          backgroundColor: 'var(--white)',
        }}
      >
        <Stack spacing={1}>
          <Typography className="h4">{fullname}</Typography>
          {request.nota && (
            <Typography variant="body2" color="var(--grey-400)">
              <strong>Nota:</strong> {request.nota}
            </Typography>
          )}

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button
              variant="small"
              onClick={() => setOpenAssign(true)}
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
