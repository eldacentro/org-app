import { FieldServiceGroupType } from '@definition/field_service_groups';
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
 */
export const grupoPorSemana = ({
  invitaciones,
  rotacion,
  grupos,
}: {
  invitaciones: Pick<SpeakerInvitationType, 'weekOf' | 'respuesta'>[];
  rotacion: SpeakerDinnerRotationType | null;
  grupos: FieldServiceGroupType[];
}): Map<string, string> => {
  const turnos = new Map<string, string>();

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

  const enOrden = invitaciones
    .filter((inv) => inv.weekOf && inv.weekOf >= desde)
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  let indice = Math.max(0, activos.indexOf(rotacion.grupoInicio));

  for (const invitacion of enOrden) {
    // Un cambio puesto a mano manda sobre la cuenta, y además ES el turno que
    // se gasta: si se le pasa a otro grupo y esa semana se cena, el siguiente
    // sigue desde ahí. Lo contrario dejaría la rotación diciendo una cosa y el
    // salón haciendo otra.
    const aMano = rotacion.overrides?.[invitacion.weekOf];
    const grupo = aMano && activos.includes(aMano) ? aMano : activos[indice];

    turnos.set(invitacion.weekOf, grupo);

    if (invitacion.respuesta?.asistira && invitacion.respuesta.cena) {
      const desdeAqui = activos.indexOf(grupo);
      indice = (desdeAqui + 1) % activos.length;
    }
  }

  return turnos;
};

/** De una fecha ISO al 'YYYY/MM/DD' con el que se nombran las semanas. */
const aSemana = (iso: string) => {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;

  const dos = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}/${dos(d.getMonth() + 1)}/${dos(d.getDate())}`;
};

/**
 * El grupo de UNA semana. Para cuando ya se tiene el historial cargado y solo
 * interesa una.
 */
export const grupoDeLaSemana = (
  weekOf: string,
  datos: Parameters<typeof grupoPorSemana>[0]
): string | null => grupoPorSemana(datos).get(weekOf) ?? null;
