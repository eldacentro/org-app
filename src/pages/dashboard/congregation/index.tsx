import { ListItem } from '@mui/material';
import { useAtomValue } from 'jotai';
import {
  IconGroups,
  IconParticipants,
  IconApplications,
  IconNextEvents,
  IconJwHome,
  IconInformationBoard,
} from '@icons/index';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import usePersons from '../persons/usePersons';
import DashboardCard from '@features/dashboard/card';
import DashboardMenu from '@features/dashboard/menu';
import { useDocumentos } from '@features/documentos/useDocumentos';
import { unseenDocumentosCountState } from '@states/documentos';

const CongregationCard = () => {
  const { t } = useAppTranslation();

  const { isPublisher, isAdmin, isGroup, isPersonViewer, isElder } =
    useCurrentUser();

  const { show_AP, AP_count } = usePersons();
  
  useDocumentos(); // Para cargar los documentos en el estado
  const unseenCount = useAtomValue(unseenDocumentosCountState);

  return (
    <DashboardCard
      header={isGroup ? t('tr_languageGroupShort') : t('tr_congregation')}
      icon={<IconJwHome />}
    >
      {/* 1. Personas */}
      {isPersonViewer && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconParticipants color="var(--black)" />}
            primaryText={t('tr_persons', 'Personas')}
            path="/persons"
          />
        </ListItem>
      )}

      {/* 2. Grupos de predicación */}
      {(isAdmin || isPublisher) && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconGroups color="var(--black)" />}
            primaryText={t('tr_fieldServiceGroups')}
            path="/field-service-groups"
          />
        </ListItem>
      )}

      {/* 3. Solicitudes de precursor */}
      {isElder && show_AP && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconApplications color="var(--black)" />}
            primaryText={t('tr_pioneerApplications')}
            badgeText={AP_count}
            path="/pioneer-applications"
          />
        </ListItem>
      )}

      {/* Documentos */}
      <ListItem disablePadding>
        <DashboardMenu
          icon={<IconInformationBoard color="var(--black)" />}
          primaryText="Documentos"
          badgeText={unseenCount > 0 ? String(unseenCount) : undefined}
          path="/congregation/documentos"
        />
      </ListItem>

      {/* Próximos eventos */}
      <ListItem disablePadding>
        <DashboardMenu
          icon={<IconNextEvents color="var(--black)" />}
          primaryText={t('tr_upcomingEvents')}
          path="/activities/upcoming-events"
        />
      </ListItem>
    </DashboardCard>
  );
};

export default CongregationCard;
