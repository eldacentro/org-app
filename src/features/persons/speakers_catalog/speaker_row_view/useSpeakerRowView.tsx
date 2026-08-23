import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { fullnameOptionState } from '@states/settings';
import { speakerOverridesState } from '@states/speaker_overrides';
import { VisitingSpeakerType } from '@definition/visiting_speakers';

/**
 * Una fila del catálogo.
 *
 * Aquí NO se pregunta quién eres ni de qué congregación es el orador, y es a
 * propósito: esta fila se pinta una vez por cada orador, y la congregación tiene
 * 650. Preguntarlo aquí significaba montar el hook de permisos —que son más de
 * cien hooks— seiscientas cincuenta veces, y además rompió el orden de los
 * hooks y tumbó la pantalla. Lo decide la lista que las pinta, una sola vez, y
 * lo pasa hecho.
 */
const useView = (speaker: VisitingSpeakerType, allowTalksFix = false) => {
  const fullnameOption = useAtomValue(fullnameOptionState);

  const correcciones = useAtomValue(speakerOverridesState);

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
    puedeCorregir: allowTalksFix,
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
