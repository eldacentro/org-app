import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';

export const calcularGrupoReunion = (
  config: LimpiezaConfig,
  weekOf: string, // lunes de la semana (YYYY/MM/DD)
  reunionDia: 'midweek' | 'weekend',
  groups: FieldServiceGroupType[]
): string | null => {
  // Override check
  const overrideKey = `${weekOf}-${reunionDia}`;
  if (config.overrides && config.overrides[overrideKey]) {
    return config.overrides[overrideKey];
  }

  if (!config.fechaInicio) return null;

  const gruposParticipantes = config.gruposParticipantes || groups.map(g => g.group_id);

  // 1. Filtrar grupos participantes en orden
  const gruposActivos = groups
    .filter(
      (g) =>
        gruposParticipantes.includes(g.group_id) &&
        !g.group_data._deleted
    )
    .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);

  if (gruposActivos.length === 0) return null;

  // 2. Calcular semanas exactas desde el inicio
  const dInicio = new Date(config.fechaInicio);
  // Encontrar el lunes de la semana de inicio
  const dayInicio = dInicio.getDay();
  const diffInicio = dInicio.getDate() - dayInicio + (dayInicio === 0 ? -6 : 1);
  const inicioLunes = new Date(dInicio.getFullYear(), dInicio.getMonth(), diffInicio);
  inicioLunes.setHours(0, 0, 0, 0);

  const semanaParts = weekOf.split('/').map(Number);
  const semanaLunes = new Date(semanaParts[0], semanaParts[1] - 1, semanaParts[2]);
  semanaLunes.setHours(0, 0, 0, 0);

  const diffTime = semanaLunes.getTime() - inicioLunes.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
  const semanasReales = Math.floor(diffDays / 7);

  // 3. Encontrar índice del grupo inicio
  const idxInicio = gruposActivos.findIndex(
    (g) => g.group_id === config.grupoInicio
  );
  if (idxInicio === -1) return null;

  // 4. Cada semana tiene 2 reuniones: midweek (0) y weekend (1)
  const meetingOffsetThisWeek = reunionDia === 'midweek' ? 0 : 1;
  const totalMeetingsOffset = (semanasReales * 2) + meetingOffsetThisWeek;

  // 5. Calcular grupo actual
  const idxActual = (idxInicio + totalMeetingsOffset) % gruposActivos.length;
  const idx = idxActual < 0 ? idxActual + gruposActivos.length : idxActual;

  return gruposActivos[idx]?.group_id ?? null;
};
