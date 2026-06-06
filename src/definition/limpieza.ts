export type LimpiezaConfig = {
  id: string;
  updatedAt: string;
  fechaInicio: string; // ISO date de inicio rotación
  grupoInicio: string; // id del primer grupo
  gruposParticipantes: string[]; // ids de grupos activos
  notasGenerales?: string;
  overrides?: Record<string, string>; // "YYYY/MM/DD-midweek": "group_id"
};

export type LimpiezaAsignacion = {
  semanaOf: string; // ISO date del lunes de esa semana
  grupoId: string; // id del grupo asignado
  reunionDia: 'midweek' | 'weekend';
  diaEspecial?: string; // ej: 'martes' para visita SC
  completada: boolean;
  updatedAt: string;
};
