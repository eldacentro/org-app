import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';
import { displaySnackNotification } from '@services/states/app';
import { personIsAwayOn } from '@services/app/persons';
import { personGetDisplayName } from '@utils/common';
import { personsByViewState } from '@states/persons';
import { schedulesState } from '@states/schedules';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import { dbSchedBulkUpdate } from '@services/dexie/schedules';
import {
  collectMeetingMonthAssignees,
  countMeetingChangesSincePublish,
  isMeetingMonthPublished,
  MeetingPublishKey,
  meetingMonthNeedsPublishing,
  restampMeetingMonthPublished,
} from '@services/app/meetings_publish';

/**
 * La tira de aviso de publicación, arriba de la página del programa.
 *
 * Tres cosas que hay que decir donde se está trabajando, y ninguna interrumpe:
 * nada de diálogos, que aquí se está escribiendo el programa.
 *
 * 1. El mes está en borrador: solo lo ve quien lo edita. Sin esto, publicar es
 *    un botón que no se sabe si hace falta pulsar.
 * 2. El mes está publicado y se ha cambiado algo desde entonces: la
 *    congregación ya vio la versión anterior. Se puede volver a publicar, que
 *    pone la fecha al día y cierra el aviso.
 * 3. Alguien de este mes tiene una ausencia apuntada en esas fechas — el caso
 *    de "se apuntó la ausencia DESPUÉS de asignarle". La aplicación no
 *    desasigna a nadie sola: avisa, y decide una persona.
 */
const MeetingPublishNotice = ({
  type,
  month,
}: {
  type: MeetingPublishKey;
  month: string;
}) => {
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const persons = useAtomValue(personsByViewState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const needsPublishing = meetingMonthNeedsPublishing(month, type);

  const isPublished = useMemo(
    () => isMeetingMonthPublished(schedules, month, type, dataView),
    [schedules, month, type, dataView]
  );

  const changes = useMemo(
    () => countMeetingChangesSincePublish(schedules, month, type, dataView),
    [schedules, month, type, dataView]
  );

  const awayNames = useMemo(() => {
    const found: string[] = [];

    for (const assignee of collectMeetingMonthAssignees(
      schedules,
      month,
      type,
      dataView
    )) {
      const person = persons.find(
        (record) => record.person_uid === assignee.uid
      );

      if (!person) continue;

      if (!personIsAwayOn(person, assignee.weekOf.replace(/\//g, '-'))) continue;

      const name =
        personGetDisplayName(person, displayNameEnabled, fullnameOption) ||
        assignee.name;

      if (name && !found.includes(name)) found.push(name);
    }

    return found;
  }, [
    schedules,
    month,
    type,
    dataView,
    persons,
    displayNameEnabled,
    fullnameOption,
  ]);

  const handleRepublish = async () => {
    const toSave = restampMeetingMonthPublished(
      schedules,
      month,
      type,
      dataView
    );

    if (toSave.length === 0) return;

    await dbSchedBulkUpdate(toSave);

    displaySnackNotification({
      header: 'Hecho',
      message: 'Los cambios de este mes quedan publicados.',
      severity: 'success',
    });
  };

  const showDraft = needsPublishing && !isPublished;
  const showChanged = needsPublishing && isPublished && changes > 0;
  const showAway = awayNames.length > 0;

  if (!showDraft && !showChanged && !showAway) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {showDraft && (
        <InfoTip
          isBig={false}
          color="warning"
          text="Este mes está en borrador: solo lo ves tú. Los hermanos no verán sus asignaciones hasta que lo publiques."
        />
      )}

      {showChanged && (
        <InfoTip isBig={false} color="warning">
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
            }}
          >
            <Typography
              className="body-regular"
              sx={{ color: 'var(--orange-dark)' }}
            >
              {`Este mes está publicado. Has hecho ${changes} ${changes === 1 ? 'cambio' : 'cambios'} desde entonces.`}
            </Typography>

            <Button variant="small" onClick={handleRepublish}>
              Volver a publicar
            </Button>
          </Box>
        </InfoTip>
      )}

      {showAway && (
        <InfoTip
          isBig={false}
          color="warning"
          text={`${awayNames.join(', ')} ${awayNames.length === 1 ? 'tiene una ausencia apuntada' : 'tienen una ausencia apuntada'} en las fechas que tiene asignadas este mes. Nadie se desasigna solo: mira si hay que cambiarlo.`}
        />
      )}
    </Box>
  );
};

export default MeetingPublishNotice;
