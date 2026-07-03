import { useState } from 'react';
import { createEvent } from 'ics';
import { saveAs } from 'file-saver';
import { AssignmentHistoryType } from '@definition/schedules';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { upsertCalendarExportEntry } from '@services/calendar_export/tracking';
import { buildAssignmentEvent, BuildEventContext } from './buildAssignmentEvent';

/**
 * Generates and downloads an .ics for a single "Mis asignaciones" row.
 *
 * Reuses a STABLE uid (`${assignment.id}@eldacentro.calendar`) and an
 * incrementing SEQUENCE per assignment (tracked in
 * `@services/calendar_export/tracking`): re-exporting after a real change
 * bumps SEQUENCE, so Google/Apple/Outlook update the existing calendar entry
 * in place instead of creating a duplicate. Re-exporting with no change
 * keeps the same SEQUENCE (idempotent no-op).
 */
const useAddAssignmentToCalendar = () => {
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const handleAddToCalendar = (
    history: AssignmentHistoryType,
    context: BuildEventContext
  ) => {
    if (isProcessingId) return;

    setIsProcessingId(history.id);

    try {
      const { eventDetails, icsUid, sequence, contentHash } = buildAssignmentEvent(
        history,
        context
      );

      createEvent(eventDetails, (error, value) => {
        if (error) {
          console.error(error);
          setIsProcessingId(null);
          displaySnackNotification({
            header: getMessageByCode('error_app_generic-title'),
            message: getMessageByCode(error.message),
            severity: 'error',
          });
          return;
        }

        const blob = new Blob([value], { type: 'text/calendar' });
        saveAs(blob, `${history.id}.ics`);

        upsertCalendarExportEntry(history.id, {
          icsUid,
          sequence,
          contentHash,
          exportedAt: new Date().toISOString(),
          title: history.assignment.title,
        });

        setIsProcessingId(null);
      });
    } catch (error) {
      console.error(error);
      setIsProcessingId(null);
    }
  };

  return { isProcessingId, handleAddToCalendar };
};

export default useAddAssignmentToCalendar;
