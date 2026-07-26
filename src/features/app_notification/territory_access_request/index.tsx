import { ComponentProps, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { TerritoryRequest } from '@definition/territories';
import { buildPersonFullname } from '@utils/common';
import { personsActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import Typography from '@components/typography';
import Button from '@components/button';
import DialogAsignar from '@features/territories/dialogs/DialogAsignar';
import { useTerritories } from '@features/territories/useTerritories';

/**
 * Envoltorio que ENCIENDE las suscripciones de Territorios mientras el
 * diálogo está abierto.
 *
 * La campana puede aparecer en cualquier pantalla, y el hook que alimenta
 * esta notificación solo se suscribe a las SOLICITUDES. Fuera de la página de
 * Territorios, la lista de territorios, las zonas, las asignaciones y los
 * ajustes estaban vacíos: al pulsar «Asignar territorio» el selector decía
 * «no options», y la fecha de vencimiento se habría calculado con los ajustes
 * por defecto en vez de con los de la congregación.
 *
 * `useTerritories` lleva un contador de referencias con suscripciones
 * compartidas, así que montarlo aquí no duplica nada si ya se está en
 * Territorios, y se cierra solo al cerrar el diálogo.
 */
const DialogAsignarConDatos = (
  props: ComponentProps<typeof DialogAsignar>
) => {
  useTerritories();
  return <DialogAsignar {...props} />;
};

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
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--accent-200)',
          backgroundColor: 'var(--white)',
          boxShadow: 'var(--small-card-shadow)',
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
                borderRadius: 'var(--radius-l)',
                fontWeight: 600,
                fontSize: '14px',
                letterSpacing: '0.01em',
                boxShadow: 'var(--btn-shadow)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: 'var(--hover-shadow)',
                }
              }}
            >
              Asignar territorio
            </Button>
          </Stack>
        </Stack>
      </Box>

      {openAssign && (
        <DialogAsignarConDatos
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
