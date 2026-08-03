import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { sourcesFormattedState } from '@states/sources';
import { congAccountConnectedState } from '@states/app';
import { schedulesState, selectedWeekState } from '@states/schedules';
import { userDataViewState } from '@states/settings';
import { buildFieldChanges } from '@services/app/last_modified';
import { useAppTranslation } from '@hooks/index';
import {
  isMeetingMonthPublished,
  meetingMonthNeedsPublishing,
} from '@services/app/meetings_publish';

const useMidweek = () => {
  const { t } = useAppTranslation();

  const sources = useAtomValue(sourcesFormattedState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const selectedWeek = useAtomValue(selectedWeekState);
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);

  const currentSched = schedules.find((s) => s.weekOf === selectedWeek);

  /**
   * Qué campos de esta semana se han tocado, para el panel de «Última
   * actualización».
   *
   * Se agrupa por PARTE y no por casilla: «Presidente» son en realidad la
   * sala principal y la auxiliar, y a quien mira la página le da igual esa
   * estructura. `buildFieldChanges` se queda con la marca más nueva de dentro
   * de cada una.
   */
  const changes = useMemo(() => {
    const meeting = currentSched?.midweek_meeting;

    if (!meeting) return [];

    const maestros = t('tr_applyFieldMinistryPart', 'Seamos mejores maestros');
    const vida = t('tr_livingPart', 'Nuestra vida cristiana');

    return buildFieldChanges(
      [
        { label: t('tr_chairman', 'Presidente'), node: meeting.chairman },
        {
          label: t('tr_openingPrayer', 'Oración de apertura'),
          node: meeting.opening_prayer,
        },
        {
          label: t('tr_treasuresPart', 'Tesoros de la Biblia'),
          node: meeting.tgw_talk,
        },
        {
          label: t('tr_tgwGems', 'Busquemos perlas escondidas'),
          node: meeting.tgw_gems,
        },
        {
          label: t('tr_bibleReading', 'Lectura de la Biblia'),
          node: meeting.tgw_bible_reading,
        },
        { label: `${maestros} (parte 1)`, node: meeting.ayf_part1 },
        { label: `${maestros} (parte 2)`, node: meeting.ayf_part2 },
        { label: `${maestros} (parte 3)`, node: meeting.ayf_part3 },
        { label: `${maestros} (parte 4)`, node: meeting.ayf_part4 },
        { label: `${vida} (parte 1)`, node: meeting.lc_part1 },
        { label: `${vida} (parte 2)`, node: meeting.lc_part2 },
        { label: `${vida} (parte 3)`, node: meeting.lc_part3 },
        {
          label: t('tr_cbs', 'Estudio bíblico de la congregación'),
          node: meeting.lc_cbs,
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
          label: t('tr_auxClassroomServiceGroup', 'Grupo de la clase auxiliar'),
          node: meeting.aux_fsg,
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
  const selectedMonth = selectedWeek?.substring(0, 7) ?? '';

  const monthIsPublished = isMeetingMonthPublished(
    schedules,
    selectedMonth,
    'midweek',
    dataView
  );

  const monthIsHistoric = !meetingMonthNeedsPublishing(
    selectedMonth,
    'midweek'
  );

  const [openAutofill, setOpenAutofill] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openPublish, setOpenPublish] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);

  const handleOpenQuickSettings = () => setQuickSettingsOpen(true);

  const handleCloseQuickSettings = () => setQuickSettingsOpen(false);

  const hasWeeks = sources.length > 0;

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

export default useMidweek;
