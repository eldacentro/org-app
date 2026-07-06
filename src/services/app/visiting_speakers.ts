import { store } from '@states/index';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { buildPersonFullname } from '@utils/common';
import { fullnameOptionState } from '@states/settings';

// La reconciliación de enlaces vive en un módulo aparte sin dependencias de
// Jotai, porque también la usa el web worker de sincronización (que no
// comparte store con la pestaña). Se reexporta aquí para no romper a quien
// ya importaba estas funciones desde este archivo.
export {
  resolveLocalCongId,
  reconcileOutgoingSpeakerLinks,
  type SpeakerReconcileResult,
} from './visiting_speakers_reconcile';

export const speakersSortByName = (speakers: VisitingSpeakerType[]) => {
  const fullnameOption = store.get(fullnameOptionState);

  return speakers.toSorted((a, b) => {
    const fullnameA = buildPersonFullname(
      a.speaker_data.person_lastname.value,
      a.speaker_data.person_firstname.value,
      fullnameOption
    );

    const fullnameB = buildPersonFullname(
      b.speaker_data.person_lastname.value,
      b.speaker_data.person_firstname.value,
      fullnameOption
    );

    if (fullnameA === '') return 1;
    if (fullnameB === '') return -1;

    return fullnameA.localeCompare(fullnameB, undefined, {
      sensitivity: 'base',
    });
  });
};
