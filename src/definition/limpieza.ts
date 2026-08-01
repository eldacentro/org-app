export type LimpiezaConfig = {
  id: string;
  updatedAt: string;
  fechaInicio: string; // ISO date de inicio rotación
  grupoInicio: string; // id del primer grupo
  gruposParticipantes: string[]; // ids de grupos activos
  /**
   * Alterna por parejas al cerrar cada vuelta.
   *
   * Con un número PAR de grupos, una rotación de uno por reunión deja a cada
   * grupo siempre en la misma reunión: si el 1 limpia entre semana, el 1 limpia
   * entre semana siempre. Con esto activado, la vuelta siguiente intercambia
   * los grupos de dos en dos —1,2,3,4,5,6 y luego 2,1,4,3,6,5— y cada grupo
   * pasa por las dos reuniones.
   *
   * Con un número impar no hace falta: la rotación ya alterna sola.
   */
  alternarParejas?: boolean;
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
