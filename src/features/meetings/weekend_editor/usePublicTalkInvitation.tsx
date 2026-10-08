import { useMemo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { personsState } from '@states/persons';
import {
  congNameState,
  congAddressState,
  settingsState,
  fullnameOptionState,
  publicTalkSpeakersEmailState,
} from '@states/settings';
import { responsabilidadesState } from '@states/responsabilidades';
import { buildPersonFullname } from '@utils/common';
import {
  incomingSpeakersState,
  myCongSpeakersState,
} from '@states/visiting_speakers';
import { speakersCongregationsActiveState } from '@states/speakers_congregations';
import { publicTalksLocaleState } from '@states/public_talks';
import { schedulesState } from '@states/schedules';
import { congIDState } from '@states/settings';
import { crearInvitacionOrador } from '@services/firebase/speaker_invitations';
import { esSemanaDeVisita } from '@services/app/rotacion_cenas';
import { sendEmailNotification } from '@services/firebase/email';
import { displaySnackNotification } from '@services/states/app';
import { userDataViewState } from '@states/settings';
import { schedulesGetData } from '@services/app/schedules';
import { useAppTranslation } from '@hooks/index';
import React from 'react';
import VisitingSpeakerInvitation from '@views/meetings/weekend/VisitingSpeakerInvitation';
import { generateAndSharePdf } from './pdfShare';
import { CoordinatorInfo } from '@views/meetings/weekend/VisitingSpeakerInvitation/index.types';
import { nombreArchivo } from '@utils/nombre_pdf';

const usePublicTalkInvitation = (
  /** La semana en crudo (yyyy/MM/dd), para la cápsula de periodo del PDF. */
  weekOf: string,
  weekDateLocale: string,
  time: string,
  selectedTalkNumber?: number,
  speakerUid?: string,
  talkType?: string,
  speakerNameFallback?: string
) => {
  const { t } = useAppTranslation();

  const persons = useAtomValue(personsState);
  const settings = useAtomValue(settingsState);
  const congName = useAtomValue(congNameState);
  const congAddress = useAtomValue(congAddressState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const localSpeakers = useAtomValue(myCongSpeakersState);
  const talksData = useAtomValue(publicTalksLocaleState);
  const speakersEmail = useAtomValue(publicTalkSpeakersEmailState);
  const speakersCongregations = useAtomValue(speakersCongregationsActiveState);
  const schedules = useAtomValue(schedulesState);
  const congId = useAtomValue(congIDState);
  const dataView = useAtomValue(userDataViewState);

  /** El programa de esa semana, de donde salen la oración final y La Atalaya. */
  const schedule = useMemo(
    () => schedules.find((record) => record.weekOf === weekOf),
    [schedules, weekOf]
  );

  // Speaker Info
  const speakerInfo = useMemo(() => {
    if (!speakerUid) return null;

    if (talkType === 'localSpeaker') {
      return localSpeakers.find((s) => s.person_uid === speakerUid);
    }
    return incomingSpeakers.find((s) => s.person_uid === speakerUid);
  }, [speakerUid, talkType, localSpeakers, incomingSpeakers]);

  // Si el orador ya no está en el catálogo (se borró), se usa el nombre
  // que ya se guardó junto con el uid al momento de asignarlo (ver
  // `schedulesSaveAssignment`) en vez de dejar la invitación sin nombre.
  const speakerEmail = speakerInfo?.speaker_data.person_email?.value ?? '';

  const speakerName = speakerInfo
    ? `${speakerInfo.speaker_data.person_firstname.value} ${speakerInfo.speaker_data.person_lastname.value}`
    : speakerUid
      ? speakerNameFallback || ''
      : '';

  // La congregación del orador — para la línea secundaria de la invitación.
  const speakerCongregation = useMemo(() => {
    const congId = speakerInfo?.speaker_data.cong_id;
    if (!congId) return '';

    const cong = speakersCongregations.find((record) => record.id === congId);
    return cong?.cong_data.cong_name.value ?? '';
  }, [speakerInfo, speakersCongregations]);

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
    if (!responsabilidades)
      return settings.cong_settings.responsabilities?.coordinator;
    const coordinatorCargo = responsabilidades.cargosAncianos.find(
      (c) => normalizeStr(c.cargo) === 'coordinador'
    );
    return (
      coordinatorCargo?.responsable ||
      settings.cong_settings.responsabilities?.coordinator
    );
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
    if (
      publicTalkDept.type === 'extended' &&
      Array.isArray(publicTalkDept.members)
    ) {
      publicTalkDept.members.forEach((memberUid) => {
        if (memberUid && !uids.includes(memberUid)) {
          uids.push(memberUid);
        }
      });
    }
    return uids;
  }, [publicTalkDept]);

  // Helper to resolve UIDs to CoordinatorInfo objects
  const resolveCoordinatorInfo = useCallback(
    (uid?: string): CoordinatorInfo => {
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
    },
    [persons, fullnameOption]
  );

  const congCoordinatorInfo = useMemo(() => {
    return resolveCoordinatorInfo(congCoordinatorUid);
  }, [congCoordinatorUid, resolveCoordinatorInfo]);

  const ptcCoordinatorInfo = useMemo(() => {
    return resolveCoordinatorInfo(ptcCoordinatorUid);
  }, [ptcCoordinatorUid, resolveCoordinatorInfo]);

  const assistantsInfo = useMemo(() => {
    return assistantsUids.map((uid) => resolveCoordinatorInfo(uid));
  }, [assistantsUids, resolveCoordinatorInfo]);

  /**
   * ¿Lleva además la oración final?
   *
   * Se mira el PROGRAMA, no se da por hecho: la carta solo lo dice cuando de
   * verdad se le ha asignado. Si se diera por supuesto, el orador llegaría
   * preparado para una oración que no le toca — o al revés, que es peor.
   */
  const closingPrayer = useMemo(() => {
    if (!schedule || !speakerUid) return false;

    const asignacion = schedulesGetData(
      schedule,
      'weekend_meeting.closing_prayer',
      dataView
    ) as { value?: string } | undefined;

    return asignacion?.value === speakerUid;
  }, [schedule, speakerUid, dataView]);

  /** Quien conduce el estudio de La Atalaya esa semana. */
  const wtConductorName = useMemo(() => {
    if (!schedule) return '';

    const asignacion = schedulesGetData(
      schedule,
      'weekend_meeting.wt_study.conductor',
      dataView
    ) as { value?: string } | undefined;

    if (!asignacion?.value) return '';

    return resolveCoordinatorInfo(asignacion.value).name;
  }, [schedule, dataView, resolveCoordinatorInfo]);

  /**
   * EL ENLACE PARA QUE CONTESTE.
   *
   * Se crea al mandar la invitación y no al asignar al orador: si naciera al
   * asignarlo, cada cambio de orador dejaría enlaces huérfanos vivos durante
   * meses. `crearInvitacionOrador` reutiliza el que ya hubiera para esa semana y
   * ese orador — si cada envío generase uno nuevo, él podría contestar en uno y
   * la congregación estar mirando otro.
   *
   * Si falla (sin conexión), devuelve cadena vacía y la invitación sale IGUAL
   * con el correo de siempre: quedarse sin carta por no poder crear un enlace
   * sería cambiar una molestia por un problema.
   */
  const crearEnlace = async () => {
    if (!congId || !speakerUid) return '';

    // En la semana de la visita del superintendente no hay orador visitante al
    // que invitar. Crear el enlace igualmente dejaría una invitación fantasma
    // que además gastaría turno en la rotación de cenas.
    if (esSemanaDeVisita(weekOf, schedules)) return '';

    try {
      const token = await crearInvitacionOrador(congId, {
        weekOf,
        speakerUid,
        speakerName,
        congName,
        congAddress,
        dateLocale: weekDateLocale,
        time,
        talkNumber: selectedTalkNumber ? String(selectedTalkNumber) : '',
        talkTitle: outlineTitle,
        closingPrayer,
      });

      return `${window.location.origin}/#/o/${congId}/${token}`;
    } catch (error) {
      console.error('No se pudo crear el enlace de respuesta', error);
      return '';
    }
  };

  const handleGenerate = async () => {
    if (!speakerName) return;

    /*
      EL ENLACE PARA QUE CONTESTE, creado al generar la carta.

      Se hace aquí y no antes porque es cuando de verdad hace falta: si se
      creara al asignar al orador, cada cambio de orador dejaría enlaces
      huérfanos vivos durante meses. `crearInvitacionOrador` reutiliza el que ya
      hubiera para esa semana y ese orador — si cada carta generase uno nuevo,
      él podría contestar en uno y nosotros estar mirando otro.

      Si falla (sin conexión, por ejemplo), la carta se genera IGUAL con el
      correo de siempre: quedarse sin invitación por no poder crear un enlace
      sería cambiar una molestia por un problema.
    */
    const enlace = await crearEnlace();

    const document = (
      <VisitingSpeakerInvitation
        speakerName={speakerName}
        speakerCongregation={speakerCongregation}
        dateRaw={weekOf}
        dateLocale={weekDateLocale}
        time={time}
        outlineNumber={selectedTalkNumber ? selectedTalkNumber.toString() : ''}
        outlineTitle={outlineTitle}
        congregationName={congName}
        congregationAddress={congAddress}
        publicTalkCoordinator={ptcCoordinatorInfo}
        assistants={assistantsInfo}
        mediaEmail={
          speakersEmail ||
          ptcCoordinatorInfo.email ||
          congCoordinatorInfo.email ||
          ''
        }
        closingPrayer={closingPrayer}
        dinner={{
          url: enlace || undefined,
          email:
            speakersEmail ||
            ptcCoordinatorInfo.email ||
            congCoordinatorInfo.email ||
            '',
        }}
        expenses={{
          coordinator: congCoordinatorInfo.name,
          fallback: wtConductorName,
        }}
      />
    );

    // Sin extensión: `generateAndSharePdf` le pone el `.pdf`.
    const fileName = nombreArchivo(
      'Invitación al orador visitante',
      speakerName,
      ''
    );
    await generateAndSharePdf(document, fileName, t);
  };

  /**
   * LA MISMA INVITACIÓN, POR CORREO.
   *
   * Manda el texto de la carta y el enlace para contestar. No sustituye al PDF
   * —hay quien prefiere pasarlo por WhatsApp—: es el otro camino para lo mismo.
   *
   * No se manda nada si el orador no tiene correo en el catálogo: sería un
   * botón que parece funcionar y no hace nada.
   */
  const handleSendEmail = async () => {
    if (!speakerEmail || !speakerName) return;

    const enlace = await crearEnlace();

    const linea = (texto: string) =>
      `<p style="margin:0 0 14px 0;">${texto}</p>`;

    const html = [
      linea(`Querido hermano ${speakerName}:`),
      linea(
        'Nos alegra mucho contar con tu visita y te extendemos una afectuosa invitación para presentar el discurso público en nuestra congregación.'
      ),
      linea(
        `<strong>${weekDateLocale}${time ? ` · ${time}` : ''}</strong>` +
          (outlineTitle
            ? `<br>${selectedTalkNumber ? `N.º ${selectedTalkNumber} · ` : ''}${outlineTitle}`
            : '') +
          (congAddress ? `<br>${congAddress}` : '')
      ),
      linea(
        'Si te es posible y así lo permiten las circunstancias, nos agradaría disfrutar de tus comentarios y de aquellos que te acompañen en el estudio de La Atalaya de esa semana. Si es así, nos gustaría asignarte la oración final de la reunión.'
      ),
      linea(
        'La congregación ha hecho los preparativos necesarios para que, si lo deseas, tú y tus acompañantes podáis cenar con una familia después de la reunión. Por favor, ten la amabilidad de indicarnos si cenarás y cuántos en total seréis, al menos una semana antes de tu discurso.'
      ),
      enlace
        ? `<p style="margin:24px 0;"><a class="btn" href="${enlace}">Contestar aquí, en dos toques</a></p>`
        : '',
      linea(
        'Si por alguna razón no pudieses cumplir con tu asignación, por favor, hazlo saber a la mayor brevedad posible.'
      ),
      linea(
        `Deseosos de poder estar juntos y disfrutar de una excelente reunión, te mandamos nuestro cariño,<br>Congregación ${congName}.`
      ),
    ].join('');

    await sendEmailNotification(
      speakerEmail,
      `Invitación para el discurso público · ${weekDateLocale}`,
      html
    );

    displaySnackNotification({
      header: 'Invitación enviada',
      message: `Se ha mandado a ${speakerEmail}.`,
      severity: 'success',
    });
  };

  return {
    speakerEmail,
    handleSendEmail,
    handleGenerate,
    speakerName,
  };
};

export default usePublicTalkInvitation;
