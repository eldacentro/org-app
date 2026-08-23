import { useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  congNameState,
  congNumberState,
  fullnameOptionState,
} from '@states/settings';
import { speakersCongregationsActiveState } from '@states/speakers_congregations';
import { resolveLocalCongId } from '@services/app/visiting_speakers_reconcile';
import { speakerOverridesState } from '@states/speaker_overrides';
import { useCurrentUser } from '@hooks/index';
import { VisitingSpeakerType } from '@definition/visiting_speakers';

const useView = (speaker: VisitingSpeakerType) => {
  const fullnameOption = useAtomValue(fullnameOptionState);

  const correcciones = useAtomValue(speakerOverridesState);
  const congregations = useAtomValue(speakersCongregationsActiveState);
  const congName = useAtomValue(congNameState);
  const congNumber = useAtomValue(congNumberState);
  const { isPublicTalkCoordinator, isWeekendEditor } = useCurrentUser();

  /**
   * Solo se corrige a los de FUERA.
   *
   * A los nuestros se les edita la ficha y ya: la lista de correcciones existe
   * porque el Sheet del circuito reconstruye los discursos de los de fuera en
   * cada pasada, y eso a los propios no les pasa. A los añadidos a mano
   * tampoco, que el sync los respeta.
   */
  const localCongId = resolveLocalCongId(congregations, congName, congNumber);

  const esDeFuera =
    !!localCongId &&
    speaker.speaker_data.cong_id !== localCongId &&
    !speaker.speaker_data.manual?.value;

  const [showDetails, setShowDetails] = useState(false);
  const [openSpeakerDetails, setOpenSpeakerDetails] = useState(false);
  const [openTalksFix, setOpenTalksFix] = useState(false);

  const correccion = correcciones.find(
    (record) => record.speakerUid === speaker.person_uid
  );

  const handleShowDetails = () => setShowDetails(true);

  const handleHideDetails = () => setShowDetails(false);

  const handleOpenSpeakerDetails = () => setOpenSpeakerDetails(true);

  const handleCloseSpeakerDetails = () => setOpenSpeakerDetails(false);

  const talks = speaker.speaker_data.talks
    .filter((record) => record._deleted === false)
    .map((record) => record.talk_number)
    .join(', ');

  return {
    talks,
    correccion,
    /** Quien arma el fin de semana necesita la lista buena; el resto, mirar. */
    puedeCorregir: esDeFuera && (isPublicTalkCoordinator || isWeekendEditor),
    openTalksFix,
    handleOpenTalksFix: () => setOpenTalksFix(true),
    handleCloseTalksFix: () => setOpenTalksFix(false),
    fullnameOption,
    showDetails,
    handleShowDetails,
    handleHideDetails,
    openSpeakerDetails,
    handleOpenSpeakerDetails,
    handleCloseSpeakerDetails,
  };
};

export default useView;
