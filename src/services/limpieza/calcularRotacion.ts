import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { SchedWeekType } from '@definition/schedules';
import { Week } from '@definition/week_type';
import { schedulesWeekNoMeeting } from '@services/app/schedules';

/**
 * Calcula qué grupo le toca limpiar en una reunión específica.
 *
 * @param schedules  Lista de semanas de la congregación (para saltar semanas de asamblea,
 *                   visita del SO, etc.). Cuando está vacía se cuentan todas las semanas,
 *                   que es el comportamiento heredado para la función de "congelar" el pasado.
 */
export const calcularGrupoReunion = (
  config: LimpiezaConfig,
  weekOf: string, // lunes de la semana (YYYY/MM/DD)
  reunionDia: 'midweek' | 'weekend',
  groups: FieldServiceGroupType[],
  schedules: SchedWeekType[] = []
): string | null => {
  // Override manual → siempre tiene prioridad
  const overrideKey = `${weekOf}-${reunionDia}`;
  if (config.overrides?.[overrideKey]) {
    return config.overrides[overrideKey];
  }

  if (!config.fechaInicio) return null;

  const gruposParticipantes = config.gruposParticipantes || groups.map((g) => g.group_id);

  const gruposActivos = groups
    .filter((g) => gruposParticipantes.includes(g.group_id) && !g.group_data._deleted)
    .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);

  if (gruposActivos.length === 0) return null;

  // ── Lunes de la semana de inicio ──────────────────────────────────────────
  const dInicio = new Date(config.fechaInicio);
  const dayInicio = dInicio.getDay();
  const diffInicio = dInicio.getDate() - dayInicio + (dayInicio === 0 ? -6 : 1);
  const inicioLunes = new Date(dInicio.getFullYear(), dInicio.getMonth(), diffInicio);
  inicioLunes.setHours(0, 0, 0, 0);

  // ── Lunes de la semana objetivo ───────────────────────────────────────────
  const semanaParts = weekOf.split('/').map(Number);
  const semanaLunes = new Date(semanaParts[0], semanaParts[1] - 1, semanaParts[2]);
  semanaLunes.setHours(0, 0, 0, 0);

  // ── Contar reuniones que SÍ se celebraron desde inicio hasta la semana objetivo ──
  // Cuando schedules está vacío (freeze de pasado) se usan los valores de fallback
  // Week.NORMAL, de forma que schedulesWeekNoMeeting devuelve false y se cuentan todas.
  let meetingCount = 0;
  const current = new Date(inicioLunes);

  while (current < semanaLunes) {
    const wOf = `${current.getFullYear()}/${String(current.getMonth() + 1).padStart(2, '0')}/${String(current.getDate()).padStart(2, '0')}`;
    const schedule = schedules.find((s) => s.weekOf === wOf);

    const midweekType =
      schedule?.midweek_meeting?.week_type?.find((r) => r.type === 'main')?.value ??
      Week.NORMAL;
    if (!schedulesWeekNoMeeting(midweekType)) meetingCount++;

    const weekendType =
      schedule?.weekend_meeting?.week_type?.find((r) => r.type === 'main')?.value ??
      Week.NORMAL;
    if (!schedulesWeekNoMeeting(weekendType)) meetingCount++;

    current.setDate(current.getDate() + 7);
  }

  // Offset dentro de la semana actual: entre semana = +0, fin de semana = +1
  const meetingOffsetThisWeek = reunionDia === 'midweek' ? 0 : 1;
  const totalMeetingsOffset = meetingCount + meetingOffsetThisWeek;

  // ── Grupo inicial ─────────────────────────────────────────────────────────
  const idxInicio = gruposActivos.findIndex((g) => g.group_id === config.grupoInicio);
  if (idxInicio === -1) return null;

  const idxActual = (idxInicio + totalMeetingsOffset) % gruposActivos.length;
  const idx = idxActual < 0 ? idxActual + gruposActivos.length : idxActual;

  return gruposActivos[idx]?.group_id ?? null;
};
