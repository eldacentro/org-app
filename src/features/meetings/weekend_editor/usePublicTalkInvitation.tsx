import { useState, useMemo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { personsState } from '@states/persons';
import {
  congNameState,
  congAddressState,
  settingsState,
  fullnameOptionState,
} from '@states/settings';
import { responsabilidadesState } from '@states/responsabilidades';
import { buildPersonFullname } from '@utils/common';
import { incomingSpeakersState, myCongSpeakersState } from '@states/visiting_speakers';
import { publicTalksLocaleState } from '@states/public_talks';
import { useAppTranslation } from '@hooks/index';
import React from 'react';
import VisitingSpeakerInvitation from '@views/meetings/weekend/VisitingSpeakerInvitation';
import { generateAndSharePdf } from './pdfShare';
import { CoordinatorInfo } from '@views/meetings/weekend/VisitingSpeakerInvitation/index.types';

const usePublicTalkInvitation = (
  weekDateLocale: string,
  time: string,
  selectedTalkNumber?: number,
  speakerUid?: string,
  talkType?: string
) => {
  const { t } = useAppTranslation();
  
  const persons = useAtomValue(personsState);
  const settings = useAtomValue(settingsState);
  const congName = useAtomValue(congNameState);
  const congAddress = useAtomValue(congAddressState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const localSpeakers = useAtomValue(myCongSpeakersState);
  const talksData = useAtomValue(publicTalksLocaleState);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Speaker Info
  const speakerInfo = useMemo(() => {
    if (!speakerUid) return null;
    
    if (talkType === 'localSpeaker') {
      return localSpeakers.find((s) => s.person_uid === speakerUid);
    }
    return incomingSpeakers.find((s) => s.person_uid === speakerUid);
  }, [speakerUid, talkType, localSpeakers, incomingSpeakers]);

  const speakerName = speakerInfo 
    ? `${speakerInfo.speaker_data.person_firstname.value} ${speakerInfo.speaker_data.person_lastname.value}`
    : '';

  // Outline Info
  const outlineTitle = useMemo(() => {
    if (!selectedTalkNumber) return '';
    const talk = talksData.find((t) => t.talk_number === selectedTalkNumber);
    return talk ? talk.talk_title : '';
  }, [selectedTalkNumber, talksData]);

  // Load responsibilities and fullname settings
  const responsabilidades = useAtomValue(responsabilidadesState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const normalizeStr = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Find coordinator of the body of elders
  const congCoordinatorUid = useMemo(() => {
    if (!responsabilidades) return settings.cong_settings.responsabilities?.coordinator;
    const coordinatorCargo = responsabilidades.cargosAncianos.find(
      (c) => normalizeStr(c.cargo) === 'coordinador'
    );
    return coordinatorCargo?.responsable || settings.cong_settings.responsabilities?.coordinator;
  }, [responsabilidades, settings]);

  // Find public talk department (e.g. "Discursos públicos")
  const publicTalkDept = useMemo(() => {
    if (!responsabilidades) return null;
    const dept = responsabilidades.departamentos.find((d) =>
      normalizeStr(d.name).includes('discurso')
    );
    return dept || null;
  }, [responsabilidades]);

  const ptcCoordinatorUid = publicTalkDept?.responsable || '';

  const assistantsUids = useMemo(() => {
    if (!publicTalkDept) return [];
    const uids: string[] = [];
    if (publicTalkDept.auxiliar) {
      uids.push(publicTalkDept.auxiliar);
    }
    if (publicTalkDept.type === 'extended' && Array.isArray(publicTalkDept.members)) {
      publicTalkDept.members.forEach((memberUid) => {
        if (memberUid && !uids.includes(memberUid)) {
          uids.push(memberUid);
        }
      });
    }
    return uids;
  }, [publicTalkDept]);

  // Helper to resolve UIDs to CoordinatorInfo objects
  const resolveCoordinatorInfo = useCallback((uid?: string): CoordinatorInfo => {
    if (!uid) return { name: '', email: '', phone: '' };
    const p = persons.find((x) => x.person_uid === uid);
    if (!p) return { name: '', email: '', phone: '' };
    return {
      name: buildPersonFullname(
        p.person_data.person_lastname.value,
        p.person_data.person_firstname.value,
        fullnameOption
      ),
      email: p.person_data.email.value || '',
      phone: p.person_data.phone.value || '',
    };
  }, [persons, fullnameOption]);

  const congCoordinatorInfo = useMemo(() => {
    return resolveCoordinatorInfo(congCoordinatorUid);
  }, [congCoordinatorUid, resolveCoordinatorInfo]);

  const ptcCoordinatorInfo = useMemo(() => {
    return resolveCoordinatorInfo(ptcCoordinatorUid);
  }, [ptcCoordinatorUid, resolveCoordinatorInfo]);

  const assistantsInfo = useMemo(() => {
    return assistantsUids.map((uid) => resolveCoordinatorInfo(uid));
  }, [assistantsUids, resolveCoordinatorInfo]);

  const handleOpenDialog = () => setDialogOpen(true);
  const handleCloseDialog = () => setDialogOpen(false);

  // Auto-prompt logic: trigger when both speaker and talk are selected, and haven't prompted yet
  const shouldPrompt = Boolean(speakerUid && selectedTalkNumber && !hasPrompted && talkType === 'visitingSpeaker');

  if (shouldPrompt && !dialogOpen) {
    setDialogOpen(true);
    setHasPrompted(true);
  }

  const handleGenerate = async () => {
    if (!speakerName) return;

    const document = (
      <VisitingSpeakerInvitation
        speakerName={speakerName}
        dateLocale={weekDateLocale}
        time={time}
        outlineNumber={selectedTalkNumber ? selectedTalkNumber.toString() : ''}
        outlineTitle={outlineTitle}
        congregationName={congName}
        congregationAddress={congAddress}
        publicTalkCoordinator={ptcCoordinatorInfo}
        assistants={assistantsInfo}
        mediaEmail={ptcCoordinatorInfo.email || congCoordinatorInfo.email || ''}
      />
    );

    const fileName = `Invitacion_Discurso_${speakerName.replace(/\s+/g, '_')}`;
    await generateAndSharePdf(document, fileName, t);
  };

  return {
    dialogOpen,
    handleOpenDialog,
    handleCloseDialog,
    handleGenerate,
    speakerName,
  };
};

export default usePublicTalkInvitation;
