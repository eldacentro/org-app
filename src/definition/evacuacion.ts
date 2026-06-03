export type RolEmergencia = {
  rol: string;
  nombre: string;
  responsabilidades: string[];
};

export type MiembroEquipo = {
  posicion?: string; // A1, A2, B1...
  nombre: string;
};

export type EquipoEvacuacion = {
  id: string;
  nombre: string;
  color: string;
  zona?: string;
  miembros: MiembroEquipo[];
  procedimiento: string[];
};

export type PlanEvacuacion = {
  updatedAt: string;
  tiempoMaximo: number; // minutos
  estructuraMando: RolEmergencia[];
  equipos: EquipoEvacuacion[];
  normasGenerales: string[];
  extintores: { id: number; tipo: string }[];
};
