import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { PersonType } from '@definition/person';
import { SchedWeekType } from '@definition/schedules';

// Módulo sin dependencias de Jotai/estado de React a propósito: lo importa
// tanto el hilo principal (importación manual) como el web worker de
// sincronización (restauración automática diaria) — un worker no comparte
// el store de la pestaña, así que este archivo no puede depender de él.

const normalizeForMatch = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// Igual que normalizeForMatch, pero conserva las palabras por separado en
// vez de aplastarlas en una sola cadena \u2014 lo necesita matchSpeakerToPerson
// para comparar por palabras sueltas en vez de exigir la cadena completa.
const tokenize = (str: string): string[] => {
  if (!str) return [];
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
};

/**
 * Resuelve el id de "mi congregación" dentro de la tabla speakers_congregations
 * — misma lógica de emparejamiento (nombre normalizado o número) que usa
 * myCongSpeakersState/incomingSpeakersState, extraída aquí para que el código
 * que corre fuera de React (servicios de importación/reconciliación) pueda
 * resolverla sin duplicar la comparación.
 */
export const resolveLocalCongId = (
  congregations: SpeakersCongregationsType[],
  congName: string,
  congNumber: string
): string | undefined => {
  const normalizedHomeName = normalizeForMatch(congName);

  const localCong = congregations.find((record) => {
    if (!record.cong_data) return false;

    const nameVal =
      typeof record.cong_data.cong_name === 'object'
        ? record.cong_data.cong_name?.value
        : record.cong_data.cong_name;
    const numVal =
      typeof record.cong_data.cong_number === 'object'
        ? record.cong_data.cong_number?.value
        : record.cong_data.cong_number;

    const recordName = normalizeForMatch(String(nameVal ?? ''));
    const recordNumber = String(numVal || '').trim();

    return (
      (recordName !== '' && recordName === normalizedHomeName) ||
      (recordNumber !== '' && recordNumber === congNumber)
    );
  });

  return localCong?.id;
};

/**
 * Busca la Persona real cuyo nombre "encaja" con el nombre denormalizado
 * guardado en el registro de orador. El Sheet suele traer el nombre legal
 * completo (segundo nombre, segundo apellido) mientras que la app guarda a
 * propósito una forma abreviada para mostrar (p. ej. "Saca M.") — exigir
 * coincidencia exacta de la cadena completa dejaba huérfano para siempre a
 * cualquier discursante cuyo nombre en el Sheet no calzara carácter por
 * carácter con el de la app (caso real: "Alejandro Amorós López" en el
 * Sheet vs. "Alejandro" / "Amorós" en la app).
 *
 * En su lugar, se compara por palabras sueltas: hay coincidencia si el
 * nombre completo de la Persona aparece entre las palabras del Sheet, y su
 * apellido paterno (la primera palabra del apellido guardado) también
 * aparece ahí — sin exigir que el resto (segundo nombre, segundo apellido,
 * iniciales) calce.
 *
 * Si esto arroja más de un candidato (dos personas con el mismo nombre y
 * apellido paterno, p. ej. "Carlos Saca M." y "Carlos Saca Jr."), se usa el
 * campo "Nombre completo" como desempate: solo si exactamente una de ellas
 * lo tiene lleno y contiene TODAS las palabras que trae el Sheet, se usa
 * esa. Si sigue habiendo empate, o ninguna lo tiene lleno, no se arriesga a
 * enlazar con la persona equivocada — se deja para resolver a mano, igual
 * que si no hubiera ninguna coincidencia.
 */
const matchSpeakerToPerson = (
  speaker: VisitingSpeakerType,
  persons: PersonType[]
): PersonType | null => {
  const speakerTokens = tokenize(
    `${speaker.speaker_data.person_firstname.value} ${speaker.speaker_data.person_lastname.value}`
  );

  if (speakerTokens.length === 0) return null;

  const speakerTokenSet = new Set(speakerTokens);

  const matches = persons.filter((person) => {
    const firstnameTokens = tokenize(person.person_data.person_firstname.value);
    const lastnameTokens = tokenize(person.person_data.person_lastname.value);

    // Nombre o apellido vacíos no deben calzar por vacío (every() de un
    // array vacío da true) — sin esto, una Persona sin nombre guardado
    // "coincidiría" con cualquier discursante por accidente.
    if (firstnameTokens.length === 0 || lastnameTokens.length === 0) return false;

    const firstnameMatches = firstnameTokens.every((token) =>
      speakerTokenSet.has(token)
    );
    const paternalSurnameMatches = speakerTokenSet.has(lastnameTokens[0]);

    return firstnameMatches && paternalSurnameMatches;
  });

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) return null;

  // Desempate con "Nombre completo": el Sheet puede omitir un segundo
  // nombre que sí esté ahí (por eso se compara en este sentido — todas las
  // palabras del Sheet deben estar en el nombre completo, no al revés).
  const fullNameMatches = matches.filter((person) => {
    const fullNameTokens = tokenize(person.person_data.person_fullname?.value ?? '');
    if (fullNameTokens.length === 0) return false;

    const fullNameTokenSet = new Set(fullNameTokens);
    return speakerTokens.every((token) => fullNameTokenSet.has(token));
  });

  return fullNameMatches.length === 1 ? fullNameMatches[0] : null;
};

export type SpeakerReconcileResult = {
  speakers: VisitingSpeakerType[];
  reconciledUids: { oldUid: string; newUid: string }[];
};

export type SpeakerMatchDiagnosticReason =
  | 'not-outgoing'
  | 'wrong-congregation'
  | 'already-linked'
  | 'no-candidates'
  | 'ambiguous';

export type SpeakerMatchDiagnostic = {
  speakerName: string;
  reason: SpeakerMatchDiagnosticReason;
  linkedPersonName?: string;
  candidateNames?: string[];
};

/**
 * Explica, para cada orador saliente que NO se pudo reconectar solo, por
 * qué — sin adivinar más allá de lo que ya intenta reconcileOutgoingSpeakerLinks,
 * solo hace visible la razón exacta en vez de fallar en silencio. Pensado
 * para diagnosticar casos reales que "deberían" reconectarse y no lo hacen.
 */
export const diagnoseUnmatchedSpeakers = (
  speakers: VisitingSpeakerType[],
  persons: PersonType[],
  localCongId: string | undefined
): SpeakerMatchDiagnostic[] => {
  const activePersonUids = new Set(persons.map((p) => p.person_uid));
  const results: SpeakerMatchDiagnostic[] = [];

  for (const speaker of speakers) {
    const speakerName =
      `${speaker.speaker_data.person_firstname.value} ${speaker.speaker_data.person_lastname.value}`.trim();

    if (speaker.speaker_data.local.value) continue;

    if (!localCongId || speaker.speaker_data.cong_id !== localCongId) {
      results.push({ speakerName, reason: 'wrong-congregation' });
      continue;
    }

    if (activePersonUids.has(speaker.person_uid)) {
      const linked = persons.find((p) => p.person_uid === speaker.person_uid);
      const linkedPersonName = linked
        ? `${linked.person_data.person_firstname.value} ${linked.person_data.person_lastname.value}`.trim()
        : undefined;

      // Ya enlazado a una Persona real — no se reporta como problema salvo
      // que el nombre enlazado sea claramente distinto al del Sheet (indicio
      // de un enlace incorrecto hecho antes de que existiera esta lógica).
      if (linkedPersonName && normalizeForMatch(linkedPersonName) !== normalizeForMatch(speakerName)) {
        results.push({ speakerName, reason: 'already-linked', linkedPersonName });
      }
      continue;
    }

    const speakerTokens = tokenize(speakerName);
    if (speakerTokens.length === 0) continue;
    const speakerTokenSet = new Set(speakerTokens);

    const candidates = persons.filter((person) => {
      const firstnameTokens = tokenize(person.person_data.person_firstname.value);
      const lastnameTokens = tokenize(person.person_data.person_lastname.value);
      if (firstnameTokens.length === 0 || lastnameTokens.length === 0) return false;

      return (
        firstnameTokens.every((token) => speakerTokenSet.has(token)) &&
        speakerTokenSet.has(lastnameTokens[0])
      );
    });

    if (candidates.length === 0) {
      results.push({ speakerName, reason: 'no-candidates' });
      continue;
    }

    if (candidates.length === 1) continue; // se reconecta solo, no es un problema

    const fullNameMatches = candidates.filter((person) => {
      const fullNameTokens = tokenize(person.person_data.person_fullname?.value ?? '');
      if (fullNameTokens.length === 0) return false;
      const fullNameTokenSet = new Set(fullNameTokens);
      return speakerTokens.every((token) => fullNameTokenSet.has(token));
    });

    if (fullNameMatches.length === 1) continue; // el desempate ya lo resuelve

    results.push({
      speakerName,
      reason: 'ambiguous',
      candidateNames: candidates.map((p) =>
        `${p.person_data.person_firstname.value} ${p.person_data.person_lastname.value}`.trim()
      ),
    });
  }

  return results;
};

/**
 * Repara el enlace de los oradores salientes (nuestros propios publicadores)
 * cuyo person_uid no corresponde a ninguna Persona real de la congregación
 * — típico de una importación externa (p. ej. la hoja de cálculo del
 * circuito) que genera su propio identificador por no conocer el interno de
 * la app. Cuando encuentra una única coincidencia exacta de nombre, sustituye
 * el person_uid por el real; si no encuentra ninguna o hay varias posibles,
 * deja el registro tal cual para que se resuelva a mano.
 *
 * No toca a los oradores visitantes (de otras congregaciones): para esos no
 * existe una Persona local que enlazar, y buscar por nombre ahí sería
 * arriesgado (podría coincidir por casualidad con alguien de la congregación
 * que no tiene nada que ver).
 *
 * IMPORTANTE: `localCongId` es obligatorio y se comprueba explícitamente —
 * sin él, un discursante del circuito con el mismo nombre que un publicador
 * de ESTA congregación se reconectaría por error con la Persona local
 * (confirmado como bug real; ver auditoría de Discursos). Si no se puede
 * resolver el id de la propia congregación, no se reconcilia nada.
 */
export const reconcileOutgoingSpeakerLinks = (
  speakers: VisitingSpeakerType[],
  persons: PersonType[],
  localCongId: string | undefined
): SpeakerReconcileResult => {
  if (!localCongId) return { speakers, reconciledUids: [] };

  const activePersonUids = new Set(persons.map((p) => p.person_uid));

  const usedUids = new Set(
    speakers
      .filter((s) => activePersonUids.has(s.person_uid))
      .map((s) => s.person_uid)
  );

  const reconciledUids: { oldUid: string; newUid: string }[] = [];

  const result = speakers.map((speaker) => {
    if (speaker.speaker_data.local.value) return speaker;
    if (speaker.speaker_data.cong_id !== localCongId) return speaker;
    if (activePersonUids.has(speaker.person_uid)) return speaker;

    const matchedPerson = matchSpeakerToPerson(speaker, persons);

    if (!matchedPerson || usedUids.has(matchedPerson.person_uid)) {
      return speaker;
    }

    usedUids.add(matchedPerson.person_uid);
    reconciledUids.push({
      oldUid: speaker.person_uid,
      newUid: matchedPerson.person_uid,
    });

    // Solo se corrige el enlace (person_uid) — el nombre denormalizado del
    // orador se deja TAL CUAL lo trae el Sheet. Nunca se muestra en pantalla
    // (la vista siempre resuelve el nombre en vivo desde la Persona real vía
    // person_uid), pero el backend SÍ lo usa al día siguiente para reconocer
    // "es el mismo discursante de ayer" cuando llega el nuevo sync — si aquí
    // se sobreescribe con el nombre abreviado de la app, el sync de mañana
    // ya no reconoce el nombre y crea un huérfano nuevo, deshaciendo esta
    // misma reconciliación (bug real confirmado: "Alejandro Amorós López",
    // "Carlos Saca Miranda", etc. volvían a quedar sin enlazar cada día).
    return { ...speaker, person_uid: matchedPerson.person_uid };
  });

  return { speakers: result, reconciledUids };
};

/**
 * Cuando reconcileOutgoingSpeakerLinks corrige el person_uid de un orador
 * saliente, los programas que ya lo tenían asignado a Discursos salientes
 * (weekend_meeting.outgoing_talks) siguen guardando el uid VIEJO — sin esto,
 * el enlace del catálogo queda arreglado pero el historial de asignaciones
 * ya hechas se queda huérfano (el nombre se ve por el respaldo denormalizado,
 * pero deja de ser el mismo registro enlazado).
 *
 * Devuelve solo las semanas que realmente cambiaron, listas para
 * appDb.sched.bulkPut — no toca las demás.
 */
export const remapOutgoingTalkAssignments = (
  schedules: SchedWeekType[],
  reconciledUids: { oldUid: string; newUid: string }[]
): SchedWeekType[] => {
  if (reconciledUids.length === 0) return [];

  const uidMap = new Map(reconciledUids.map(({ oldUid, newUid }) => [oldUid, newUid]));

  // Resolución transitiva: si en el mismo ciclo un huérfano A se reconcilia
  // con la Persona B (reconcileOutgoingSpeakerLinks) y ese mismo B resulta
  // ser además un duplicado que se fusiona con el superviviente C
  // (dbDeduplicateSpeakers), un programa que todavía apuntaba a A debe
  // terminar en C — un solo salto por el mapa lo dejaría a medio camino en
  // B, que para entonces ya no es un registro vivo.
  const resolveFinalUid = (uid: string): string => {
    let current = uid;
    const seen = new Set<string>([current]);
    let next = uidMap.get(current);
    while (next && !seen.has(next)) {
      current = next;
      seen.add(current);
      next = uidMap.get(current);
    }
    return current;
  };

  const changed: SchedWeekType[] = [];

  for (const schedule of schedules) {
    const talks = schedule.weekend_meeting?.outgoing_talks;
    if (!talks || talks.length === 0) continue;

    let didChange = false;

    const newTalks = talks.map((talk) => {
      if (!uidMap.has(talk.value)) return talk;

      const newUid = resolveFinalUid(talk.value);
      if (newUid === talk.value) return talk;

      didChange = true;
      return { ...talk, value: newUid };
    });

    if (didChange) {
      changed.push({
        ...schedule,
        weekend_meeting: { ...schedule.weekend_meeting, outgoing_talks: newTalks },
      });
    }
  }

  return changed;
};
