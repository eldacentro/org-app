export type DepartmentAssignment = {
  value: string; // person_uid
  updatedAt: string;
  // Nombre guardado junto con el uid al momento de asignar (igual que el
  // resto de asignaciones de la app) — si la persona se borra después, las
  // vistas de solo lectura y el PDF pueden seguir mostrando quién estaba
  // asignado en vez de quedarse en blanco sin ningún rastro.
  name?: string;
};

export type DeptWeekType = {
  weekOf: string; // mismo formato que SchedWeekType "2024/05/20"
  updatedAt?: string;
  lastModifiedBy?: string;
  acomodadores: {
    exterior: DepartmentAssignment;
    interior: DepartmentAssignment;
  };
  microfonos: {
    micro1: DepartmentAssignment;
    micro2: DepartmentAssignment;
  };
  multimedia: {
    video: DepartmentAssignment;
    audio: DepartmentAssignment;
  };
  plataforma: {
    encargado: DepartmentAssignment;
  };
};
