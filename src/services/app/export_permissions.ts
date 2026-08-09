/**
 * QUIÉN PUEDE EXPORTAR QUÉ — en un solo sitio.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * El interruptor de «exportación a PDF» de Mi cuenta tiene que salirle solo a
 * quien pueda exportar algo: a un publicador raso, encenderlo no le hace
 * aparecer ni un botón, porque no llega a ninguna página que exporte.
 *
 * Eso se resolvía con una lista de roles escrita a mano al lado del
 * interruptor. Funciona el día que se escribe y deja de funcionar el día que
 * alguien añade una exportación nueva y no se acuerda de volver aquí — y este
 * repo ya tiene dos listas de roles desincronizadas entre sí (`VIP_ROLES` en el
 * cliente y `ROLE_MASTER_KEY` en el servidor) para saber cómo acaba eso.
 *
 * Así que la lista no se escribe dos veces: se declara UNA vez, sitio por
 * sitio, y la pregunta «¿puede exportar algo?» se calcula. Añadir una
 * exportación nueva es añadir una línea aquí, y el interruptor se entera solo.
 *
 * ── Qué NO es esto ───────────────────────────────────────────────────────
 *
 * No es el guardia de las páginas. A cada página se entra por su `*Route` de
 * `App.tsx`, y eso sigue mandando: aquí no se abre ninguna puerta. Lo que hay
 * aquí es la MISMA condición, escrita para poder preguntarla sin estar dentro
 * de la página — que es justo lo que necesita el interruptor.
 *
 * Solo están los sitios que el interruptor gobierna de verdad (los que miran
 * `pdfExportEnabledState`). Exportar personas, la copia de la congregación o
 * el S-21 son otra cosa: no dependen del interruptor, así que no cuentan para
 * decidir si enseñarlo.
 */

export type ExportRoles = {
  isAdmin: boolean;
  isElder: boolean;
  isServiceCommittee: boolean;
  isMidweekEditor: boolean;
  isWeekendEditor: boolean;
  isDepartmentsEditor: boolean;
  isPublicTalkCoordinator: boolean;
};

/**
 * Cada sitio con botón de exportar a PDF, y quién lo ve.
 *
 * La condición de cada uno es la de su guardia de ruta (`App.tsx`), copiada
 * aquí a propósito y solo aquí. Si cambias una, cambia también la de allí.
 */
export const PDF_EXPORT_SITES = {
  /** Próximos eventos — `canManageEvents` en su página. */
  upcoming_events: (roles: ExportRoles) => roles.isAdmin || roles.isElder,

  /** Reunión de entre semana — `MidweekEditorRoute`. */
  midweek: (roles: ExportRoles) => roles.isMidweekEditor,

  /** Reunión de fin de semana — `WeekendPublicTalkRoute`. */
  weekend: (roles: ExportRoles) =>
    roles.isWeekendEditor || roles.isPublicTalkCoordinator,

  /** Exhibidores — `ServiceCommitteeRoute`. */
  exhibitors: (roles: ExportRoles) => roles.isServiceCommittee,

  /** Salidas de predicación — `ServiceCommitteeRoute`. */
  service_outings: (roles: ExportRoles) => roles.isServiceCommittee,

  /** Departamentos — `MidweekDepartmentsRoute`. */
  departments: (roles: ExportRoles) =>
    roles.isMidweekEditor || roles.isDepartmentsEditor,

  /**
   * Plan de evacuación.
   *
   * Lo podía exportar cualquiera: la página está abierta a toda la
   * congregación —y debe estarlo, que todos sepan por dónde salir— pero
   * sacarse el plano en PDF es cosa de quien lo lleva. Mismo criterio que el
   * engranaje de configuración que ya tenía la página.
   */
  evacuacion: (roles: ExportRoles) => roles.isAdmin || roles.isElder,
} as const;

export type PdfExportSite = keyof typeof PDF_EXPORT_SITES;

/** ¿Ve esta cuenta el botón de exportar de ESTE sitio? */
export const canExportSite = (site: PdfExportSite, roles: ExportRoles) =>
  PDF_EXPORT_SITES[site](roles);

/**
 * ¿Puede esta cuenta exportar ALGO, lo que sea?
 *
 * Es la unión de todo lo de arriba, calculada — no una lista aparte. Es lo que
 * decide si el interruptor de Mi cuenta se enseña o no.
 */
export const canExportAnything = (roles: ExportRoles) =>
  Object.values(PDF_EXPORT_SITES).some((puede) => puede(roles));
