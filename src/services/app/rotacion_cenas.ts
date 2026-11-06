import { FieldServiceGroupType } from '@definition/field_service_groups';
import { SchedWeekType } from '@definition/schedules';
import { Week } from '@definition/week_type';
import {
  SpeakerDinnerRotationType,
  SpeakerInvitationType,
} from '@definition/speaker_invitation';

/**
 * A QUÉ GRUPO LE TOCA ACOGER LA CENA DEL ORADOR.
 *
 * NO es una cuenta de semanas, y por eso no sirve el motor de Limpieza (que es
 * lo que había aquí hasta el 2026-10-08). La diferencia está en qué hace
 * avanzar el turno:
 *
 *   · En Limpieza avanza el CALENDARIO: pase lo que pase, la semana siguiente
 *     le toca al siguiente grupo.
 *   · Aquí avanza la CENA. Si el orador no se queda —y pasa a menudo—, ese
 *     grupo no ha acogido a nadie, así que sigue siendo su turno. Si saltara,
 *     un grupo podría pasarse media rotación sin acoger nunca, solo por la
 *     casualidad de que a él le tocaran las semanas en que nadie se queda.
 *
 * De ahí que haga falta el HISTORIAL de invitaciones y no solo la fecha: el
 * turno de una semana depende de lo que pasó en las anteriores.
 *
 * Una semana sin contestar todavía no gasta turno: hasta que no se sabe si
 * cenan, no se sabe. Las semanas siguientes siguen enseñando ese mismo grupo,
 * que es lo honesto, y se recolocan solas en cuanto conteste.
 *
 * Y la SEMANA DE LA VISITA DEL SUPERINTENDENTE DE CIRCUITO queda fuera: ahí el
 * discurso lo da él, no hay orador visitante y no hay cena que repartir. Ni sale
 * en el panel, ni gasta turno, ni aparece en «Mis asignaciones» — si gastara
 * turno, un grupo perdería el suyo por una semana en la que no había nada que
 * acoger.
 */
type InvitacionParaTurno = Pick<SpeakerInvitationType, 'weekOf' | 'respuesta'> &
  Partial<Pick<SpeakerInvitationType, 'expiresAt' | 'revoked'>>;

type DatosRotacion = {
  invitaciones: InvitacionParaTurno[];
  rotacion: SpeakerDinnerRotationType | null;
  grupos: FieldServiceGroupType[];
  /** Para dejar fuera la semana de la visita del superintendente. */
  schedules?: SchedWeekType[];
  /**
   * El lunes de la semana en curso ('YYYY/MM/DD'). Una semana ANTERIOR a esta
   * ya pasó: si nadie contestó, ya no va a gastar turno, y cuenta como
   * resuelta. Sin él, solo cuenta como resuelta la que tiene respuesta.
   */
  hoy?: string;
};

export type TurnoCena = {
  weekOf: string;
  grupo: string;
  /** El orador se queda a cenar: esta semana gasta el turno del grupo. */
  gasta: boolean;
  /**
   * Todas las semanas anteriores de la rotación están resueltas (contestadas,
   * o ya pasadas). Mientras no lo está, una respuesta de una semana anterior
   * puede pasarle la cena al grupo siguiente, y decírselo ya a un
   * superintendente sería avisar al que no es.
   *
   * NO se guarda: la rueda se recalcula siempre con lo que hay. Se probó a
   * fijar los turnos decididos en Firestore, y un dato que se corrige después
   * —una respuesta apuntada tarde, una cena marcada por error— dejaba el turno
   * equivocado congelado para siempre.
   */
  decidido: boolean;
};

export const calcularTurnosCena = ({
  invitaciones,
  rotacion,
  grupos,
  schedules,
  hoy,
}: DatosRotacion): TurnoCena[] => {
  const turnos: TurnoCena[] = [];

  if (!rotacion?.fechaInicio) return turnos;

  const participantes =
    rotacion.gruposParticipantes?.length > 0
      ? rotacion.gruposParticipantes
      : grupos.map((g) => g.group_id);

  const activos = grupos
    .filter((g) => participantes.includes(g.group_id) && !g.group_data._deleted)
    .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index)
    .map((g) => g.group_id);

  if (activos.length === 0) return turnos;

  // La fecha de inicio llega como ISO; las semanas, como 'YYYY/MM/DD'. Se
  // comparan en el mismo formato para que no decida la zona horaria.
  const desde = aSemana(rotacion.fechaInicio);

  const enOrden = unaPorSemana(invitaciones)
    .filter((inv) => inv.weekOf && inv.weekOf >= desde)
    .filter((inv) => !esSemanaDeVisita(inv.weekOf, schedules))
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  let indice = Math.max(0, activos.indexOf(rotacion.grupoInicio));
  let anterioresResueltas = true;

  for (const invitacion of enOrden) {
    // Un cambio puesto a mano manda sobre la cuenta, y además ES el turno que
    // se gasta: si se le pasa a otro grupo y esa semana se cena, el siguiente
    // sigue desde ahí. Lo contrario dejaría la rotación diciendo una cosa y el
    // salón haciendo otra.
    const aMano = rotacion.overrides?.[invitacion.weekOf];
    const grupo = aMano && activos.includes(aMano) ? aMano : activos[indice];
    const gasta = Boolean(
      invitacion.respuesta?.asistira && invitacion.respuesta.cena
    );

    turnos.push({
      weekOf: invitacion.weekOf,
      grupo,
      gasta,
      decidido: anterioresResueltas,
    });

    if (gasta) {
      const desdeAqui = activos.indexOf(grupo);
      indice = (desdeAqui + 1) % activos.length;
    }

    const resuelta =
      Boolean(invitacion.respuesta) ||
      (hoy !== undefined && invitacion.weekOf < hoy);

    if (!resuelta) anterioresResueltas = false;
  }

  return turnos;
};

export const grupoPorSemana = (datos: DatosRotacion): Map<string, string> =>
  new Map(calcularTurnosCena(datos).map((t) => [t.weekOf, t.grupo]));

/**
 * UNA invitación por semana: la más reciente que siga viva.
 *
 * Si se cambia el orador de una semana, la carta nueva crea otra invitación y
 * la vieja seguía ahí. Las dos contaban: la semana gastaba dos turnos y al
 * superintendente le salía la cena dos veces.
 */
export const unaPorSemana = <T extends InvitacionParaTurno>(invitaciones: T[]): T[] => {
  const porSemana = new Map<string, T>();

  for (const inv of invitaciones) {
    if (inv.revoked) continue;

    const actual = porSemana.get(inv.weekOf);

    if (!actual || msDe(inv.expiresAt) > msDe(actual.expiresAt)) {
      porSemana.set(inv.weekOf, inv);
    }
  }

  return [...porSemana.values()];
};

/** `expiresAt` llega de Firestore como Timestamp; en las pruebas, como Date. */
const msDe = (fecha: unknown): number => {
  if (!fecha) return 0;
  if (fecha instanceof Date) return fecha.getTime();

  const conMillis = fecha as { toMillis?: () => number };

  return typeof conMillis.toMillis === 'function' ? conMillis.toMillis() : 0;
};

/** De una fecha ISO al 'YYYY/MM/DD' con el que se nombran las semanas. */
const aSemana = (iso: string) => {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;

  const dos = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}/${dos(d.getMonth() + 1)}/${dos(d.getDate())}`;
};

/**
 * ¿Es la semana de la visita del superintendente de circuito?
 *
 * Ese fin de semana el discurso lo da él: no hay orador visitante al que
 * invitar ni cena que repartir. Se mira el programa de la semana, que es donde
 * vive el tipo de semana.
 */
export const esSemanaDeVisita = (
  weekOf: string,
  schedules?: SchedWeekType[]
): boolean => {
  if (!schedules?.length) return false;

  const semana = schedules.find((record) => record.weekOf === weekOf);

  if (!semana) return false;

  return (
    semana.weekend_meeting?.week_type?.some(
      (record) => record.value === Week.CO_VISIT
    ) ?? false
  );
};
