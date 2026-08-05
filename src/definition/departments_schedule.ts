export type DepartmentAssignment = {
  value: string; // person_uid
  updatedAt: string;
  // Nombre guardado junto con el uid al momento de asignar (igual que el
  // resto de asignaciones de la app) — si la persona se borra después, las
  // vistas de solo lectura y el PDF pueden seguir mostrando quién estaba
  // asignado en vez de quedarse en blanco sin ningún rastro.
  name?: string;
  /**
   * Quién puso este nombre.
   *
   * El registro de la semana ya guarda un `lastModifiedBy`, pero es el del
   * último que tocó CUALQUIER puesto de esa semana. Con él, el panel de
   * «Última actualización» solo podía decir qué departamento cambió y cuándo,
   * nunca quién. Opcional: lo repartido antes de esto no lo lleva, y el panel
   * lo dice en vez de atribuírselo a nadie.
   */
  by?: string;
};

export type DeptWeekType = {
  weekOf: string; // mismo formato que SchedWeekType "2024/05/20"
  updatedAt?: string;
  lastModifiedBy?: string;
  /**
   * Publicada. Mientras no lo esté, la semana es un BORRADOR: solo la ve quien
   * puede editarla. Ver `services/app/departments_publish`.
   */
  published?: boolean;
  /**
   * La clave de cada puesto la construye `services/app/departments_slots` a
   * partir de la configuración del departamento: 'exterior' cuando se asigna
   * por semana (lo de siempre), 'exterior__midweek' por reunión,
   * 'exterior__t2' con dos turnos. Por eso son claves libres y no una lista
   * fija: así activar una opción no obliga a migrar lo ya guardado.
   */
  acomodadores: Record<string, DepartmentAssignment>;
  microfonos: Record<string, DepartmentAssignment>;
  multimedia: Record<string, DepartmentAssignment>;
  plataforma: Record<string, DepartmentAssignment>;
};
