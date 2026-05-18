export type DepartmentAssignment = {
  value: string; // person_uid
  updatedAt: string;
};

export type DeptWeekType = {
  weekOf: string; // mismo formato que SchedWeekType "2024/05/20"
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
