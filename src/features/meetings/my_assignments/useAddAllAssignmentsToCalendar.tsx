import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { createEvents } from 'ics';
import { saveAs } from 'file-saver';
import { AssignmentHistoryType } from '@definition/schedules';
import { personsState } from '@states/persons';
import { fullnameOptionState, userLocalUIDState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { useAppTranslation } from '@hooks/index';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { upsertCalendarExportEntry } from '@services/calendar_export/tracking';
import { buildAssignmentEvent } from './assignment_item/buildAssignmentEvent';

/**
 * "Añadir todo al calendario" — bulk version of the per-row export. Reuses
 * the exact same UID/SEQUENCE/timed-vs-all-day builder as the individual
 * button (`buildAssignmentEvent`), so exporting one assignment by itself and
 * exporting it again as part of "todo" always produce the identical event —
 * re-running "todo" after a change updates existing entries in place rather
 * than duplicating them, same as the single-assignment button.
 */
const useAddAllAssignmentsToCalendar = () => {
  const { t } = useAppTranslation();
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

  const [isProcessing, setIsProcessing] = useState(false);

  const personGetName = (uid: string) => {
    const person = persons.find((record) => record.person_uid === uid);
    if (!person) return '';
    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  };

  const handleAddAllToCalendar = (assignments: AssignmentHistoryType[]) => {
    if (isProcessing || assignments.length === 0) return;

    setIsProcessing(true);

    try {
      const context = { personGetName, userUID, t };
      const built = assignments.map((history) => ({
        history,
        ...buildAssignmentEvent(history, context),
      }));

      createEvents(
        built.map((b) => b.eventDetails),
        (error, value) => {
          if (error) {
            console.error(error);
            setIsProcessing(false);
            displaySnackNotification({
              header: getMessageByCode('error_app_generic-title'),
              message: getMessageByCode(error.message),
              severity: 'error',
            });
            return;
          }

          const blob = new Blob([value], { type: 'text/calendar' });
          saveAs(blob, 'mis-asignaciones.ics');

          for (const b of built) {
            upsertCalendarExportEntry(b.history.id, {
              icsUid: b.icsUid,
              sequence: b.sequence,
              contentHash: b.contentHash,
              exportedAt: new Date().toISOString(),
              title: b.history.assignment.title,
            });
          }

          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  return { isProcessing, handleAddAllToCalendar };
};

export default useAddAllAssignmentsToCalendar;
