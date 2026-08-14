import { ReactElement } from 'react';
import {
  IconAccount,
  IconAirplaneTicket,
  IconAssigned,
  IconAssignment,
  IconAuxiliaryPioneer,
  IconCalendarWeek,
  IconCart,
  IconClean,
  IconClock,
  IconDuties,
  IconE911Emergency,
  IconGroups,
  IconInformationBoard,
  IconInTerritory,
  IconJwOrg,
  IconManageAccess,
  IconMapOverview,
  IconMinistryReport,
  IconNextEvents,
  IconOutgoindSpeaker,
  IconPerson,
  IconPioneerForm,
  IconPodium,
  IconPublisherRecordCard,
  IconPublishersReports,
  IconReportToBranch,
  IconSettings,
  IconTalk,
  IconTalker,
  IconTreasuresPart,
} from '@icons/index';

/**
 * El icono de cada destino, emparejado por `id`.
 *
 * Vive aparte de `destinos.ts` a propósito: aquella es la lista de
 * quién-ve-qué y tiene que poder probarse en Node, sin React. Aquí está la
 * parte que se ve.
 *
 * Los iconos son exactamente los que ya tenía cada baldosa en su panel.
 */
const ICONOS: Record<string, typeof IconPerson> = {
  // Reuniones
  'weekly-schedules': IconClock,
  'midweek-meeting': IconTreasuresPart,
  'weekend-meeting': IconPodium,
  'departments-schedule': IconDuties,
  'assignments-balance': IconAssigned,

  // Predicación
  territories: IconMapOverview,
  exhibitors: IconCart,
  'predicacion-salidas': IconInTerritory,
  'ministry-report': IconMinistryReport,
  'auxiliary-pioneer-application': IconAuxiliaryPioneer,

  // Congregación
  persons: IconPerson,
  ausencias: IconAirplaneTicket,
  'field-service-groups': IconGroups,
  responsabilidades: IconAssignment,
  evacuacion: IconE911Emergency,
  'circuit-visit': IconCalendarWeek,
  limpieza: IconClean,
  documentos: IconInformationBoard,
  'pioneer-applications': IconPioneerForm,
  'upcoming-events': IconNextEvents,

  // Discursos
  'public-talks-list': IconTalk,
  'speakers-catalog': IconTalker,
  'outgoing-speakers': IconOutgoindSpeaker,

  // Informes
  'meeting-attendance': IconGroups,
  'publisher-records': IconPublisherRecordCard,
  'field-service-reports': IconPublishersReports,
  'branch-office-report': IconReportToBranch,

  // Configuración
  'user-profile': IconAccount,
  'congregation-settings': IconSettings,
  'manage-access': IconManageAccess,
  'meeting-materials': IconJwOrg,
};

/**
 * El icono de un destino. Si algún día se añade uno sin icono, sale el de
 * "documento" en vez de un hueco: un destino sin icono descuadra la fila.
 */
export const iconoDestino = (
  id: string,
  tamano = 22,
  color = 'var(--brand)'
): ReactElement => {
  const Componente = ICONOS[id] ?? IconInformationBoard;

  return <Componente color={color} width={tamano} height={tamano} />;
};
