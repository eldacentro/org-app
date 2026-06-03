export type AncianoCargo = {
  cargo: string;
  responsable: string;
};

export type DepartamentoSimple = {
  id: string;
  name: string;
  type: 'simple';
  responsable: string;
  auxiliar?: string;
  updatedAt: string;
};

export type DepartamentoExtended = {
  id: string;
  name: string;
  type: 'extended';
  responsable: string;
  auxiliar?: string;
  members: string[];
  updatedAt: string;
};

export type Departamento = DepartamentoSimple | DepartamentoExtended;

export type ResponsabilidadesType = {
  id: string;
  updatedAt: string;
  lastModifiedBy?: string;
  cuerpoAncianos: string[];
  cargosAncianos: AncianoCargo[];
  departamentos: Departamento[];
};
