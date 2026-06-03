/** Cargo fijo de un anciano (el responsable es person_uid) */
export type AncianoCargo = {
  cargo: string;
  /** person_uid del responsable */
  responsable: string;
};

export type DepartamentoSimple = {
  id: string;
  name: string;
  type: 'simple';
  /** person_uid del responsable */
  responsable: string;
  /** person_uid del auxiliar (opcional) */
  auxiliar?: string;
  updatedAt: string;
};

export type DepartamentoExtended = {
  id: string;
  name: string;
  type: 'extended';
  /** person_uid del responsable */
  responsable: string;
  /** person_uid del auxiliar (opcional) */
  auxiliar?: string;
  /** array de person_uid de los miembros */
  members: string[];
  updatedAt: string;
};

export type Departamento = DepartamentoSimple | DepartamentoExtended;

export type ResponsabilidadesType = {
  id: string;
  updatedAt: string;
  lastModifiedBy?: string;
  /** array de person_uid de ancianos */
  cuerpoAncianos: string[];
  cargosAncianos: AncianoCargo[];
  departamentos: Departamento[];
};
