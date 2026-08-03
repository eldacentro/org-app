import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { sourcesFormattedState } from '@states/sources';
import { schedulesState, selectedWeekState } from '@states/schedules';
import { congAccountConnectedState } from '@states/app';
import { userDataViewState } from '@states/settings';
import { buildFieldChanges } from '@services/app/last_modified';
import { useAppTranslation } from '@hooks/index';
import {
  isMeetingMonthPublished,
  meetingMonthNeedsPublishing,
} from '@services/app/meetings_publish';
import { meetingMonthResolver } from '@services/app/meeting_month';

const useWeekend = () => {
  const { t } = useAppTranslation();

  const selectedWeek = useAtomValue(selectedWeekState);
  const schedules = useAtomValue(schedulesState);
  const currentSched = schedules.find((s) => s.weekOf === selectedWeek);
  const sources = useAtomValue(sourcesFormattedState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const dataView = useAtomValue(userDataViewState);

  /**
   * Qué campos de esta semana se han tocado, para el panel de «Última
   * actualización». Agrupado por parte, no por casilla: «Orador» son las dos
   * partes del discurso más el suplente.
   */
  const changes = useMemo(() => {
    const meeting = currentSched?.weekend_meeting;

    if (!meeting) return [];

    return buildFieldChanges(
      [
        { label: t('tr_chairman', 'Presidente'), node: meeting.chairman },
        {
          label: t('tr_openingPrayer', 'Oración de apertura'),
          node: meeting.opening_prayer,
        },
        {
          label: t('tr_publicTalk', 'Discurso público'),
          node: meeting.public_talk_type,
        },
        { label: t('tr_speaker', 'Orador'), node: meeting.speaker },
        {
          label: t('tr_watchtowerStudy', 'Estudio de La Atalaya'),
          node: meeting.wt_study,
        },
        {
          label: t('tr_closingPrayer', 'Oración de conclusión'),
          node: meeting.closing_prayer,
        },
        {
          label: t('tr_circuitOverseer', 'Superintendente de circuito'),
          node: meeting.circuit_overseer,
        },
        {
          label: t('tr_outgoingTalks', 'Discursos salientes'),
          node: meeting.outgoing_talks,
        },
        { label: t('tr_weekType', 'Tipo de semana'), node: meeting.week_type },
        {
          label: t('tr_meetingCanceled', 'Reunión cancelada'),
          node: meeting.canceled,
        },
      ],
      dataView
    );
  }, [currentSched, dataView, t]);
  // Se publica por MES, como en el resto de módulos: es la unidad con la que se
  // piensa el programa, aunque los datos vayan por semana.
  //
  // El mes es el que enseña el selector de semanas, que aquí es SIEMPRE el del
  // día de la reunión: la semana del 31 de agosto sale bajo «septiembre» porque
  // su reunión es el domingo 6. Ver `meeting_month.ts`.
  const monthOf = meetingMonthResolver('weekend');

  const selectedMonth = monthOf(selectedWeek ?? '');

  const monthIsPublished = isMeetingMonthPublished(
    schedules,
    selectedMonth,
    'weekend',
    dataView,
    monthOf
  );

  const monthIsHistoric = !meetingMonthNeedsPublishing(
    selectedMonth,
    'weekend'
  );

  const [openAutofill, setOpenAutofill] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openPublish, setOpenPublish] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);

  const hasWeeks = sources.length > 0;

  const handleOpenQuickSettings = () => setQuickSettingsOpen(true);

  const handleCloseQuickSettings = () => setQuickSettingsOpen(false);

  const handleOpenAutofill = () => setOpenAutofill(true);

  const handleCloseAutofill = () => setOpenAutofill(false);

  const handleOpenExport = () => setOpenExport(true);

  const handleCloseExport = () => setOpenExport(false);

  const handleOpenPublish = () => setOpenPublish(true);

  const handleClosePublish = () => setOpenPublish(false);

  return {
    hasWeeks,
    handleCloseAutofill,
    handleOpenAutofill,
    openAutofill,
    openExport,
    handleOpenExport,
    handleCloseExport,
    openPublish,
    handleOpenPublish,
    handleClosePublish,
    isConnected,
    selectedMonth,
    monthIsPublished,
    monthIsHistoric,
    quickSettingsOpen,
    handleOpenQuickSettings,
    handleCloseQuickSettings,
    updatedAt: currentSched?.updatedAt,
    lastModifiedBy: currentSched?.lastModifiedBy,
    changes,
  };
};

export default useWeekend;
