import { ComponentProps, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { TerritoryRequest } from '@definition/territories';
import { buildPersonFullname } from '@utils/common';
import { personsActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import {
  territoryCampaignsState,
  territoryZonesState,
  territorySettingsState,
} from '@states/territories';
import { formatTerritoryDate } from '@services/app/territories';
import Badge from '@components/badge';
import { TagChip, NotaPeticion } from '@features/territories/ui';
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
const DialogAsignarConDatos = (props: ComponentProps<typeof DialogAsignar>) => {
  useTerritories();
  return <DialogAsignar {...props} />;
};

const TerritoryAccessRequest = ({ request }: { request: TerritoryRequest }) => {
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const campaigns = useAtomValue(territoryCampaignsState);
  const zonas = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);

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
          borderRadius: 'var(--shape-md)',
          border: '1px solid var(--accent-200)',
          backgroundColor: 'var(--white)',
          boxShadow: 'var(--small-card-shadow)',
        }}
      >
        <Stack spacing={1.5}>
          {/* Lo mismo que enseña la pestaña Solicitudes: para qué lo pidió y
              de qué zona lo prefiere. Aquí no salía, así que desde la
              campanita una solicitud de campaña parecía una normal. */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ flexWrap: 'wrap', rowGap: '4px' }}
          >
            <Typography
              sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}
            >
              {fullname}
            </Typography>
            {request.campaignId && (
              <Badge
                size="small"
                color="accent"
                text={
                  campaigns.find((c) => c.id === request.campaignId)?.nombre ??
                  'Campaña'
                }
              />
            )}
            {(() => {
              const z = zonas.find((x) => x.id === request.zoneId);
              return z ? <TagChip label={z.nombre} color={z.color} /> : null;
            })()}
          </Stack>
          {/* Cuándo lo pidió. Sin fecha, tres solicitudes seguidas parecen
              todas de hoy, y aquí es justo lo que decide a quién se atiende
              antes. */}
          <Typography className="label-small-regular" color="var(--ink-3)">
            {formatTerritoryDate(request.createdAt, settings.dateFormat)}
          </Typography>

          {/* La misma nota, con la misma pinta que en la pestaña de
              Solicitudes: recortada a dos líneas y con enlace para leerla
              entera si no cabe. Aquí se quedaba entera y sin recortar, y una
              nota larga estiraba la campanita hasta empujar el botón fuera. */}
          {request.nota && <NotaPeticion nota={request.nota} />}

          <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
            <Button
              variant="main"
              onClick={() => setOpenAssign(true)}
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
          // Lo mismo que se le pasa desde la pestaña Solicitudes. Sin esto, el
          // asignador solo acertaba de rebote: se caía a "la campaña que esté
          // en marcha ahora mismo", así que una solicitud de una campaña que
          // ya terminó —o que aún no ha empezado— abría el selector con TODOS
          // los territorios, y había que acordarse de cuáles eran los de la
          // campaña.
          isCampaign={Boolean(request.campaignId)}
          campaignId={request.campaignId}
          preferredZoneId={request.zoneId}
        />
      )}
    </>
  );
};

export default TerritoryAccessRequest;
