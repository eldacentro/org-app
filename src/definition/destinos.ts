/**
 * EL ÍNDICE DE DESTINOS — los tipos.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Hasta ahora, "a qué páginas puede entrar este hermano" estaba escrito a mano
 * en SIETE paneles de baldosas, con la condición de permiso metida en el JSX
 * de cada una. El propio código ya avisaba de por qué eso es delicado:
 *
 *   «La misma condición que la puerta de la ruta, y las dos tienen que decir
 *    lo mismo — una baldosa que lleva a una pantalla prohibida es peor que no
 *    tenerla.» (panel de Reuniones, sobre Reparto de asignaciones)
 *
 * Con un buscador encima el riesgo se dobla: si el buscador se declara SU
 * propia lista, acabará habiendo dos listas que discrepan, y discrepar aquí no
 * es cosmético — es enseñar un resultado que no se puede abrir, o esconder una
 * página a quien sí puede entrar.
 *
 * Así que hay una sola lista. Hoy la consume el buscador; los paneles la
 * consumirán después (ver la nota en `features/navegacion/destinos.ts`), y
 * entonces las dos cosas saldrán del mismo sitio y no podrán discrepar.
 *
 * ── La lección que ya estaba aprendida ────────────────────────────────────
 *
 * En `definition/ayuda.ts` está escrito lo que pasa cuando el permiso se
 * deduce por su cuenta: Territorios no se abre por rol, sino por
 * `isTerritoryManager` —anciano o admin, MÁS quien esté en el departamento
 * "Territorios" aunque no sea anciano— y con las banderas sueltas «la sección
 * se le escondía justo al hermano que más la necesita».
 *
 * Por eso `visible` recibe el objeto de banderas entero y cada destino escribe
 * su condición TAL CUAL estaba en su panel. Este fichero no inventa permisos:
 * los recoge.
 */

/** Las banderas que puede mirar un destino para decidir si se ve. */
export type DestinoRoles = {
  isAdmin: boolean;
  isElder: boolean;
  isSecretary: boolean;
  isPublisher: boolean;
  isAppointed: boolean;
  isPersonViewer: boolean;
  isMidweekEditor: boolean;
  isWeekendEditor: boolean;
  isDepartmentsEditor: boolean;
  isPublicTalkCoordinator: boolean;
  isAttendanceEditor: boolean;
  isGroupOverseer: boolean;
  isLanguageGroupOverseer: boolean;
  isServiceCommittee: boolean;
  isMeetingEditor: boolean;
  isGroup: boolean;
  /** No es un rol: es el ajuste de congregación que abre las solicitudes. */
  enable_AP_application: boolean;
};

/** Los seis paneles de categoría, más el Inicio. */
export type DestinoCategoria =
  | 'reuniones'
  | 'predicacion'
  | 'congregacion'
  | 'discursos'
  | 'informes'
  | 'ajustes';

/**
 * Un destino es DATO PURO: ni un componente de React, ni un icono.
 *
 * No es manía de purista. `vitest.config.ts` dice, con todas sus letras, que
 * aquí «NO se prueba la interfaz» y solo recoge ficheros `.ts` en Node. Si el
 * índice arrastrara iconos, la lista de quién-ve-qué dejaría de poderse
 * probar — y es justo la parte que hay que probar.
 *
 * El icono de cada destino vive aparte, en `features/navegacion/iconos.tsx`.
 */
export type Destino = {
  /** Estable: lo usan las claves de React y las pruebas. */
  id: string;
  /** Clave de traducción, si la tiene. */
  clave?: string;
  /** El nombre tal cual se ve. Si hay `clave`, esto es el respaldo. */
  nombre: string;
  ruta: string;
  categoria: DestinoCategoria;
  /**
   * Quién lo ve. Recibe las banderas enteras y devuelve sí o no.
   * Si un destino lo ve todo el mundo, no hace falta escribirlo.
   */
  visible?: (r: DestinoRoles) => boolean;
  /**
   * La baldosa ocupa la fila entera. Casi todas lo hacen; las dos de
   * Reuniones que van a media fila son la excepción.
   */
  media?: boolean;
  /**
   * Palabras por las que también se encuentra. NO son etiquetas visibles:
   * existen para que quien escribe "cartelera" llegue a Exhibidores, o quien
   * escribe "S-21" llegue a Registros de publicadores.
   *
   * Se escriben en minúscula y sin acentos: el buscador normaliza las dos
   * partes antes de comparar.
   */
  sinonimos?: string[];
  /**
   * Para los destinos que son una PESTAÑA dentro de otra página (las vistas de
   * Programas semanales). La página los lee al abrirse.
   */
  pestana?: string;
};
