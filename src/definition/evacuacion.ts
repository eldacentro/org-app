/**
 * Plan de Evacuación del Salón del Reino.
 *
 * Los textos son los del documento oficial de la congregación (PDF "Plan de
 * Evacuación", fechado el 27-3-2025) y se copian LITERALMENTE. No se resumen,
 * ni se reescriben "para que suenen mejor", ni se completan con lo que parezca
 * razonable: esto es un protocolo de emergencia, y lo que ponga aquí es lo que
 * alguien va a leer y hacer. Esta pantalla llegó a mostrar responsabilidades
 * inventadas que no estaban en el documento — de ahí este aviso.
 */

export type RolEmergencia = {
  rol: string;
  nombre: string;
  responsabilidades: string[];
};

export type MiembroEquipo = {
  posicion?: string; // A1, A2, B1...
  nombre: string;
  /** En los equipos de evacuación, quien figura como responsable. */
  esResponsable?: boolean;
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
  id?: string;
  updatedAt: string;
  /** Año del plan, tal y como aparece en el encabezado del documento. */
  anio: string;
  /** Fecha del documento oficial (pie del PDF). */
  fechaDocumento: string;
  direccion: string;
  tiempoMaximo: number; // minutos
  estructuraMando: RolEmergencia[];
  /** El recuadro "PROCEDIMIENTO DE INTERVENCIÓN". */
  procedimientoIntervencion: {
    aviso: string;
    pasos: string[];
    nota?: string;
  };
  equipos: EquipoEvacuacion[];
  /** Instrucciones comunes a los dos equipos de evacuación. */
  normasEquipos: string[];
  /** Qué hacer si una salida está bloqueada, y el resto de reglas del plan. */
  reglasEspeciales: string[];
  extintores: { id: number; tipo: string }[];
};
