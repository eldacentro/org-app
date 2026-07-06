import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { outgoingSpeakersState } from '@states/visiting_speakers';

import {
  dbVisitingSpeakersDiagnose,
  dbVisitingSpeakersLocalCongSpeakerAdd,
  dbVisitingSpeakersReconcileLinks,
} from '@services/dexie/visiting_speakers';
import { speakersSortByName } from '@services/app/visiting_speakers';
import { personsActiveState, personsByViewState } from '@states/persons';
import { displaySnackNotification } from '@services/states/app';
import { useAppTranslation } from '@hooks/index';
import { IconCheckCircle, IconInfo } from '@components/icons';
import { SpeakerMatchDiagnostic } from '@services/app/visiting_speakers_reconcile';

const useSpeakersOutgoing = () => {
  const { t } = useAppTranslation();

  const outgoingSpeakers = useAtomValue(outgoingSpeakersState);
  const persons = useAtomValue(personsActiveState);
  const personsByView = useAtomValue(personsByViewState);

  const options = useMemo(() => {
    const data = speakersSortByName(outgoingSpeakers);

    return data.filter((record) => {
      const person = persons.some(
        (person) => person.person_uid === record.person_uid
      );

      if (!person) return true;

      const personInView = personsByView.some(
        (person) => person.person_uid === record.person_uid
      );

      return personInView;
    });
  }, [outgoingSpeakers, personsByView, persons]);

  const [speakers, setSpeakers] = useState(options);

  // Detecta oradores salientes cuyo person_uid no corresponde a ninguna
  // Persona real (típico de una importación externa) — solo se ofrece el
  // botón de reconciliar cuando hay algo que arreglar.
  const hasBrokenLinks = useMemo(() => {
    return outgoingSpeakers.some(
      (record) => !persons.some((person) => person.person_uid === record.person_uid)
    );
  }, [outgoingSpeakers, persons]);

  const handleSpeakerAdd = async () => {
    await dbVisitingSpeakersLocalCongSpeakerAdd(false);
  };

  const [diagnostics, setDiagnostics] = useState<SpeakerMatchDiagnostic[]>([]);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const handleReconcileLinks = async () => {
    const reconciledCount = await dbVisitingSpeakersReconcileLinks();

    if (reconciledCount > 0) {
      displaySnackNotification({
        header: t('tr_speakersReconciled'),
        message: t('tr_speakersReconciledDesc', { count: reconciledCount }),
        icon: <IconCheckCircle color="var(--card)" />,
        severity: 'success',
      });
    } else {
      displaySnackNotification({
        header: t('tr_speakersReconciledNone'),
        message: t('tr_speakersReconciledNoneDesc'),
        icon: <IconInfo color="var(--card)" />,
      });
    }

    // Después de reconectar lo que se pudo solo, se explica por qué el
    // resto (si queda algo) no se resolvió — en vez de dejarlo en silencio.
    const remaining = await dbVisitingSpeakersDiagnose();
    setDiagnostics(remaining);
    if (remaining.length > 0) setIsDiagnosticsOpen(true);
  };

  const handleCloseDiagnostics = () => setIsDiagnosticsOpen(false);

  useEffect(() => {
    setSpeakers((prev) => {
      const data = prev.filter((record) =>
        options.some((s) => s.person_uid === record.person_uid)
      );

      for (const speaker of options) {
        const index = data.findIndex(
          (record) => record.person_uid === speaker.person_uid
        );

        if (index !== -1) {
          data[index] = speaker;
        }

        if (index === -1) {
          data.push(speaker);
        }
      }

      return data;
    });
  }, [options]);

  return {
    speakers,
    handleSpeakerAdd,
    setSpeakers,
    hasBrokenLinks,
    handleReconcileLinks,
    diagnostics,
    isDiagnosticsOpen,
    handleCloseDiagnostics,
  };
};

export default useSpeakersOutgoing;
